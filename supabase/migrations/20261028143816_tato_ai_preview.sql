begin;

-- Only idempotency metadata is persisted. Proposal contents and short conversation
-- context live in authenticated, signed tokens, valid for at most 15 minutes.
create table public.ai_proposals (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 version integer not null default 1 check(version>0),
 status text not null default 'pending' check(status in ('pending','cancelled','confirmed')),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null default (now()+interval '15 minutes'),
 created_at timestamptz not null default now()
);
alter table public.ai_proposals enable row level security;
revoke all on public.ai_proposals from public,anon,authenticated;
grant select,insert,update on public.ai_proposals to authenticated;
create policy owner_select on public.ai_proposals for select to authenticated using ((select auth.uid())=user_id);
create policy owner_insert on public.ai_proposals for insert to authenticated with check ((select auth.uid())=user_id);
create policy owner_update on public.ai_proposals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index ai_proposals_owner on public.ai_proposals(user_id,created_at desc);

create function public.tato_ai_fingerprint(p_content jsonb) returns text
 language sql immutable security invoker set search_path='' as $$
 select encode(sha256(convert_to(p_content::text,'UTF8')),'hex');
$$;
create function public.tato_ai_transaction_content(t public.transactions) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('kind',t.kind,'description',t.description,'amount_cents',t.amount_cents,
 'account_id',t.account_id,'category_id',t.category_id,'occurred_on',t.occurred_on);
$$;
create function public.tato_ai_proposal_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
declare t public.transactions;
begin
 if TG_OP='INSERT' then
  new.created_at=now(); new.expires_at=now()+interval '15 minutes';
  if new.status<>'pending' or new.version<>1 then raise exception 'Proposta inicial inválida.'; end if;
 else
  if old.status<>'pending' or (old.expires_at<=clock_timestamp() and new.status<>'cancelled') then raise exception 'Proposta encerrada ou expirada.'; end if;
  if (new.id,new.user_id,new.created_at,new.expires_at) is distinct from (old.id,old.user_id,old.created_at,old.expires_at) then
   raise exception 'Identidade e validade da proposta são imutáveis.';
  end if;
  if new.status='pending' then
   if new.version<>old.version+1 then raise exception 'Revise a nova versão da proposta.'; end if;
  elsif new.version<>old.version or new.fingerprint<>old.fingerprint then raise exception 'Conteúdo alterado sem revisão.';
  end if;
  if new.status='confirmed' then
   select * into t from public.transactions where user_id=auth.uid() and id=new.id;
   if not found or t.commitment_id is not null or public.tato_ai_fingerprint(public.tato_ai_transaction_content(t))<>new.fingerprint then
    raise exception 'Confirmação exige o lançamento correspondente.';
   end if;
  end if;
 end if;
 return new;
end $$;
create trigger ai_proposal_guard before insert or update on public.ai_proposals for each row execute function public.tato_ai_proposal_guard();

create function public.tato_ai_validate_content(p_content jsonb) returns void
 language plpgsql security invoker set search_path='' as $$
declare a public.accounts; v bigint;
begin
 if auth.uid() is null then raise exception 'Entre novamente.'; end if;
 if jsonb_typeof(p_content)<>'object' or (select count(*) from jsonb_object_keys(p_content))<>6
 or not (p_content ?& array['kind','description','amount_cents','account_id','category_id','occurred_on'])
 or p_content->>'kind' not in ('income','expense')
 or length(trim(p_content->>'description')) not between 1 and 120
 or jsonb_typeof(p_content->'amount_cents')<>'number'
 or (p_content->>'amount_cents') !~ '^[0-9]+$'
 or (p_content->>'occurred_on') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or exists(select 1 from jsonb_each(p_content) where value='null'::jsonb)
 then raise exception 'Conteúdo da proposta inválido.'; end if;
 v=(p_content->>'amount_cents')::bigint;
 if v not between 1 and 99999999999 then raise exception 'Valor fora do limite.'; end if;
 select * into a from public.accounts where user_id=auth.uid() and id=(p_content->>'account_id')::uuid for update;
 if not found or a.archived then raise exception 'Escolha uma conta ativa sua.'; end if;
 if not exists(select 1 from public.categories where user_id=auth.uid() and id=(p_content->>'category_id')::uuid and kind=p_content->>'kind') then
  raise exception 'Escolha uma categoria sua compatível com o tipo.';
 end if;
 if (p_content->>'occurred_on')::date<a.reference_date or (p_content->>'occurred_on')::date>public.tato_today()
 or (p_content->>'occurred_on')::date<date '1900-01-01' then raise exception 'Confira a data; use compromissos para o futuro.'; end if;
end $$;

create function public.prepare_tato_ai_proposal(p_id uuid,p_version integer,p_content jsonb) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare p public.ai_proposals;
begin
 if p_id is null or p_content is null then raise exception 'Proposta inválida.'; end if;
 if p_version=0 then
  perform public.tato_ai_validate_content(p_content);
  insert into public.ai_proposals(id,user_id,fingerprint) values(p_id,auth.uid(),public.tato_ai_fingerprint(p_content)) returning * into p;
 else
  select * into p from public.ai_proposals where id=p_id and user_id=auth.uid() for update;
  if not found or p.version<>p_version or p.status<>'pending' or p.expires_at<=clock_timestamp() then raise exception 'Proposta mudou, encerrou ou expirou. Recarregue e revise.'; end if;
  perform public.tato_ai_validate_content(p_content);
  update public.ai_proposals set fingerprint=public.tato_ai_fingerprint(p_content),version=version+1 where id=p.id returning * into p;
 end if;
 return to_jsonb(p);
end $$;
create function public.cancel_tato_ai_proposal(p_id uuid,p_version integer) returns void
 language plpgsql security invoker set search_path='' as $$
declare p public.ai_proposals;
begin
 select * into p from public.ai_proposals where id=p_id and user_id=auth.uid() for update;
 if not found or p.version<>p_version then raise exception 'Proposta não encontrada ou mudou.'; end if;
 if p.status='cancelled' then return; end if;
 update public.ai_proposals set status='cancelled' where id=p.id;
end $$;
create function public.confirm_tato_ai_proposal(p_id uuid,p_version integer,p_content jsonb) returns uuid
 language plpgsql security invoker set search_path='' as $$
declare p public.ai_proposals; t public.transactions;
begin
 select * into p from public.ai_proposals where id=p_id and user_id=auth.uid() for update;
 if not found or p.version<>p_version then raise exception 'Proposta não encontrada ou mudou. Revise antes de confirmar.'; end if;
 if p.status='confirmed' then
  if not exists(select 1 from public.transactions where id=p.id and user_id=auth.uid()) then raise exception 'Este lançamento já foi confirmado e removido manualmente. Não será recriado.'; end if;
  return p.id;
 end if;
 if p.status<>'pending' or p.expires_at<=clock_timestamp() then raise exception 'Proposta cancelada ou expirada. Nada foi lançado.'; end if;
 if p_content is null or public.tato_ai_fingerprint(p_content)<>p.fingerprint then raise exception 'Conteúdo alterado. Revise a proposta.'; end if;
 perform public.tato_ai_validate_content(p_content);
 select * into t from public.transactions where id=p.id and user_id=auth.uid();
 if found then
  if t.commitment_id is not null or public.tato_ai_transaction_content(t)<>p_content then raise exception 'Identificador já utilizado com outro conteúdo.'; end if;
 else
  insert into public.transactions(id,user_id,kind,description,amount_cents,account_id,category_id,occurred_on)
  values(p.id,auth.uid(),p_content->>'kind',p_content->>'description',(p_content->>'amount_cents')::bigint,
   (p_content->>'account_id')::uuid,(p_content->>'category_id')::uuid,(p_content->>'occurred_on')::date);
 end if;
 update public.ai_proposals set status='confirmed' where id=p.id;
 return p.id;
end $$;

-- The only privileged subsystem: quota metadata, with a dedicated NOLOGIN role
-- that has NO privileges on financial tables. No service/admin key in the app.
create schema tato_private;
revoke all on schema tato_private from public,anon,authenticated;
create role tato_ai_quota_owner nologin noinherit;
-- Supabase's migration role is not a superuser. Membership is temporary and is
-- revoked below, after ownership assignment; authenticated never gets membership.
do $$ begin execute format('grant tato_ai_quota_owner to %I',current_user); end $$;
grant usage on schema tato_private,auth to tato_ai_quota_owner;
grant execute on function auth.uid() to tato_ai_quota_owner;
create table tato_private.ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 created_at timestamptz not null default clock_timestamp(), day date not null,
 model text not null check(length(model) between 1 and 100),
 status text not null default 'reserved' check(status in ('reserved','succeeded','timeout','unavailable','model_access','invalid_key','billing','provider_limit','invalid_output','error')),
 input_tokens integer check(input_tokens between 0 and 10000000), output_tokens integer check(output_tokens between 0 and 10000000),
 primary key(user_id,request_id)
);
alter table tato_private.ai_usage enable row level security;
revoke all on tato_private.ai_usage from public,anon,authenticated;
grant select,insert,update on tato_private.ai_usage to tato_ai_quota_owner;
create policy quota_internal on tato_private.ai_usage to tato_ai_quota_owner using (true) with check (true);
create index ai_usage_time on tato_private.ai_usage(created_at);
create index ai_usage_user_time on tato_private.ai_usage(user_id,created_at);
create index ai_usage_day on tato_private.ai_usage(day);
create function tato_private.reserve_ai(p_request uuid,p_model text) returns boolean
 language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); n timestamptz; d date;
begin
 if uid is null or p_request is null or p_model is null or length(p_model) not between 1 and 100 then raise exception 'Sessão ou requisição inválida.'; end if;
 -- A single transaction lock serializes duplicate requests and both quotas.
 perform pg_advisory_xact_lock(844571991);
 n=clock_timestamp(); d=(n at time zone 'America/Sao_Paulo')::date;
 if exists(select 1 from tato_private.ai_usage where user_id=uid and request_id=p_request) then return false; end if;
 if (select count(*) from tato_private.ai_usage where user_id=uid and created_at>n-interval '60 seconds')>=5
 or (select count(*) from tato_private.ai_usage where user_id=uid and day=d)>=20 then raise exception 'Limite de IA por pessoa atingido. Aguarde para enviar outra mensagem.'; end if;
 if (select count(*) from tato_private.ai_usage where day=d)>=100 then raise exception 'Novas mensagens de IA estão pausadas nesta prévia. Tente outro dia.'; end if;
 insert into tato_private.ai_usage(user_id,request_id,created_at,day,model) values(uid,p_request,n,d,p_model);
 return true;
end $$;
create function tato_private.finish_ai(p_request uuid,p_status text,p_input integer,p_output integer) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or p_status='reserved' or p_status is null then raise exception 'Sessão ou estado inválido.'; end if;
 update tato_private.ai_usage set status=p_status,input_tokens=p_input,output_tokens=p_output
 where user_id=auth.uid() and request_id=p_request and status='reserved';
end $$;
-- Grant CREATE only while assigning ownership; the runtime role cannot create code.
grant create on schema tato_private to tato_ai_quota_owner;
alter function tato_private.reserve_ai(uuid,text) owner to tato_ai_quota_owner;
alter function tato_private.finish_ai(uuid,text,integer,integer) owner to tato_ai_quota_owner;
revoke create on schema tato_private from tato_ai_quota_owner;
do $$ begin execute format('revoke tato_ai_quota_owner from %I',current_user); end $$;
revoke all on function tato_private.reserve_ai(uuid,text),tato_private.finish_ai(uuid,text,integer,integer) from public,anon,authenticated;
grant usage on schema tato_private to authenticated;
grant execute on function tato_private.reserve_ai(uuid,text),tato_private.finish_ai(uuid,text,integer,integer) to authenticated;
create function public.reserve_tato_ai_usage(p_request uuid,p_model text) returns boolean
 language sql security invoker set search_path='' as $$ select tato_private.reserve_ai(p_request,p_model); $$;
create function public.finish_tato_ai_usage(p_request uuid,p_status text,p_input integer,p_output integer) returns void
 language sql security invoker set search_path='' as $$ select tato_private.finish_ai(p_request,p_status,p_input,p_output); $$;

revoke all on function public.tato_ai_fingerprint(jsonb),public.tato_ai_transaction_content(public.transactions),public.tato_ai_proposal_guard(),public.tato_ai_validate_content(jsonb),public.prepare_tato_ai_proposal(uuid,integer,jsonb),public.cancel_tato_ai_proposal(uuid,integer),public.confirm_tato_ai_proposal(uuid,integer,jsonb),public.reserve_tato_ai_usage(uuid,text),public.finish_tato_ai_usage(uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.tato_ai_fingerprint(jsonb),public.tato_ai_transaction_content(public.transactions),public.tato_ai_validate_content(jsonb),public.prepare_tato_ai_proposal(uuid,integer,jsonb),public.cancel_tato_ai_proposal(uuid,integer),public.confirm_tato_ai_proposal(uuid,integer,jsonb),public.reserve_tato_ai_usage(uuid,text),public.finish_tato_ai_usage(uuid,text,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
