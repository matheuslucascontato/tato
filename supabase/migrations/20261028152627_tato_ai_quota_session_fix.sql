-- Fix quota functions on managed Supabase: the dedicated NOLOGIN owner cannot
-- access the managed auth schema. postgres lacks the grant option on that schema.
-- Read the same gateway-verified subject as the installed auth.uid() function,
-- without granting the quota owner access to financial tables or auth.users.
-- No caller-supplied user ID; signatures, ownership, ACLs and RLS stay intact.
begin;
-- postgres retains ADMIN OPTION but not SET/INHERIT on this dedicated role.
-- Add temporary membership granted by this migration role, then revoke it.
do $$ begin execute format('grant tato_ai_quota_owner to %I with inherit true, set true',current_user); end $$;
create or replace function tato_private.reserve_ai(p_request uuid,p_model text) returns boolean
 language plpgsql security definer set search_path='' as $$
declare uid uuid=(coalesce(
   nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),''),
   (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'sub')
  )::uuid); n timestamptz; d date;
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
create or replace function tato_private.finish_ai(p_request uuid,p_status text,p_input integer,p_output integer) returns void
 language plpgsql security definer set search_path='' as $$
begin
 if (coalesce(
   nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),''),
   (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'sub')
  )::uuid) is null or p_status='reserved' or p_status is null then raise exception 'Sessão ou estado inválido.'; end if;
 update tato_private.ai_usage set status=p_status,input_tokens=p_input,output_tokens=p_output
 where user_id=(coalesce(
   nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),''),
   (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'sub')
  )::uuid) and request_id=p_request and status='reserved';
end $$;

do $$ begin execute format('revoke tato_ai_quota_owner from %I',current_user); end $$;
do $$
begin
 if exists(
  select 1 from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname='tato_private' and p.proname in ('reserve_ai','finish_ai')
    and (pg_catalog.pg_get_userbyid(p.proowner)<>'tato_ai_quota_owner'
      or not p.prosecdef
      or p.proconfig is distinct from array['search_path=""']::text[])
 ) then raise exception 'Unexpected quota function ownership or security configuration'; end if;
 if pg_catalog.has_table_privilege('tato_ai_quota_owner','public.transactions','INSERT')
    or pg_catalog.has_table_privilege('authenticated','tato_private.ai_usage','SELECT')
    or pg_catalog.has_function_privilege('anon','public.reserve_tato_ai_usage(uuid,text)','EXECUTE')
 then raise exception 'Unexpected quota permissions'; end if;
end $$;
notify pgrst,'reload schema';
commit;
