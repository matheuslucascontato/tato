begin;

create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(trim(display_name)) between 1 and 120),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120),
 initial_balance_cents bigint not null check (initial_balance_cents between -99999999999 and 99999999999),
 reference_date date not null check(reference_date between date '1900-01-01' and date '9999-12-31'), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(trim(name)) between 1 and 120), kind text not null check(kind in ('income','expense')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,name,kind), unique(user_id,id,kind)
);
create table public.commitments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid, category_id uuid not null, kind text not null check(kind in ('income','expense')),
 amount_cents bigint not null check(amount_cents between 1 and 99999999999),
 description text not null check(length(trim(description)) between 1 and 120),
 due_on date not null check(due_on between date '1900-01-01' and date '9999-12-31'), status text not null default 'pending' check(status in ('pending','settled','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
 foreign key(user_id,account_id) references public.accounts(user_id,id),
 foreign key(user_id,category_id,kind) references public.categories(user_id,id,kind)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null, category_id uuid not null, kind text not null check(kind in ('income','expense')),
 amount_cents bigint not null check(amount_cents between 1 and 99999999999),
 description text not null check(length(trim(description)) between 1 and 120),
 occurred_on date not null check(occurred_on between date '1900-01-01' and date '9999-12-31'), commitment_id uuid unique,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id),
 foreign key(user_id,account_id) references public.accounts(user_id,id),
 foreign key(user_id,category_id,kind) references public.categories(user_id,id,kind),
 foreign key(user_id,commitment_id) references public.commitments(user_id,id)
);
create index accounts_owner on public.accounts(user_id);
create index categories_owner on public.categories(user_id);
create index transactions_owner_date on public.transactions(user_id,occurred_on desc);
create index transactions_account on public.transactions(user_id,account_id);
create index transactions_category on public.transactions(user_id,category_id,kind);
create index commitments_pending on public.commitments(user_id,status,due_on);
create index commitments_account on public.commitments(user_id,account_id);
create index commitments_category on public.commitments(user_id,category_id,kind);

-- Explicit grants also work when automatic privileges for new tables are disabled.
grant usage on schema public to authenticated;
revoke all on public.profiles,public.accounts,public.categories,public.transactions,public.commitments from public,anon,authenticated;
grant select,insert,update on public.profiles,public.accounts,public.categories,public.transactions,public.commitments to authenticated;
grant delete on public.transactions to authenticated;

do $$ declare tbl text; begin
 foreach tbl in array array['profiles','accounts','categories','transactions','commitments'] loop
  execute format('alter table public.%I enable row level security',tbl);
  execute format('create policy owner_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',tbl);
  execute format('create policy owner_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',tbl);
  execute format('create policy owner_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',tbl);
  if tbl='transactions' then
   execute format('create policy owner_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',tbl);
  else
   execute format('create policy no_delete on public.%I for delete to authenticated using (false)',tbl);
  end if;
 end loop;
end $$;

create function public.tato_today() returns date language sql stable security invoker set search_path='' as $$
 select (now() at time zone 'America/Sao_Paulo')::date;
$$;
create function public.tato_audit() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if new.user_id<>old.user_id or new.created_at<>old.created_at then raise exception 'Proprietário e criação são imutáveis.'; end if;
  if TG_TABLE_NAME<>'profiles' and (to_jsonb(new)->>'id') is distinct from (to_jsonb(old)->>'id') then raise exception 'Identificador imutável.'; end if;
 end if;
 new.updated_at=now(); return new;
end $$;
do $$ declare tbl text; begin
 foreach tbl in array array['profiles','accounts','categories','transactions','commitments'] loop
  execute format('create trigger audit before insert or update on public.%I for each row execute function public.tato_audit()',tbl);
 end loop;
end $$;

create function public.tato_account_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.reference_date>public.tato_today() then raise exception 'A referência não pode estar no futuro.'; end if;
 if TG_OP='UPDATE' and (new.reference_date<>old.reference_date or new.initial_balance_cents<>old.initial_balance_cents)
 and exists(select 1 from public.transactions where user_id=old.user_id and account_id=old.id) then
  raise exception 'O saldo inicial e a referência não podem mudar após o primeiro lançamento.';
 end if;
 return new;
end $$;
create trigger account_guard before insert or update on public.accounts for each row execute function public.tato_account_guard();

create function public.tato_transaction_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare a public.accounts;
begin
 if TG_OP='UPDATE' and (old.commitment_id is not null or new.commitment_id is distinct from old.commitment_id) then
  raise exception 'Use o estorno do compromisso para corrigir um lançamento vinculado.';
 end if;
 -- Row lock serializes reference edits and new movements.
 select * into a from public.accounts where user_id=new.user_id and id=new.account_id for update;
 if not found then raise exception 'Conta não encontrada ou sem permissão.'; end if;
 if a.archived and (TG_OP='INSERT' or new.account_id<>old.account_id) then raise exception 'Escolha uma conta ativa.'; end if;
 if new.occurred_on<a.reference_date then raise exception 'Lançamento anterior à referência do saldo inicial.'; end if;
 if new.occurred_on>public.tato_today() then raise exception 'Para datas futuras, use compromissos.'; end if;
 return new;
end $$;
create trigger transaction_guard before insert or update on public.transactions for each row execute function public.tato_transaction_guard();

create function public.tato_commitment_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='UPDATE' and old.status='settled' and
 (new.description,new.amount_cents,new.kind,new.category_id,new.account_id,new.due_on) is distinct from
 (old.description,old.amount_cents,old.kind,old.category_id,old.account_id,old.due_on) then
  raise exception 'Estorne a liquidação antes de editar o compromisso.';
 end if;
 return new;
end $$;
create trigger commitment_guard before update on public.commitments for each row execute function public.tato_commitment_guard();

-- Deferred integrity: no settled commitment without its one matching movement,
-- no movement attached to a pending/cancelled commitment, even via direct REST.
create function public.tato_settlement_integrity() returns trigger language plpgsql security invoker set search_path='' as $$
declare cid uuid; owner_id uuid; c public.commitments; t public.transactions;
begin
 if TG_TABLE_NAME='commitments' then cid=coalesce(new.id,old.id); owner_id=coalesce(new.user_id,old.user_id);
 else cid=coalesce(new.commitment_id,old.commitment_id); owner_id=coalesce(new.user_id,old.user_id); end if;
 if cid is null then return null; end if;
 select * into c from public.commitments where id=cid and user_id=owner_id;
 if not found then return null; end if;
 select * into t from public.transactions where commitment_id=cid and user_id=owner_id;
 if c.status='settled' then
  if t.id is null or (t.kind,t.amount_cents,t.category_id,t.description) is distinct from (c.kind,c.amount_cents,c.category_id,c.description) then
   raise exception 'Liquidação precisa de exatamente um lançamento correspondente.';
  end if;
 elsif t.id is not null then raise exception 'Compromisso pendente ou cancelado não pode ter lançamento vinculado.';
 end if;
 return null;
end $$;
create constraint trigger commitment_integrity after insert or update or delete on public.commitments deferrable initially deferred for each row execute function public.tato_settlement_integrity();
create constraint trigger transaction_integrity after insert or update or delete on public.transactions deferrable initially deferred for each row execute function public.tato_settlement_integrity();

create function public.initialize_tato(p_name text,p_account_name text,p_balance bigint,p_reference date) returns uuid
 language plpgsql security invoker set search_path='' as $$
declare uid uuid=auth.uid(); aid uuid;
begin
 if uid is null then raise exception 'Entre novamente.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.profiles(user_id,display_name) values(uid,p_name) on conflict(user_id) do update set display_name=excluded.display_name;
 insert into public.categories(user_id,name,kind) values
 (uid,'Salário','income'),(uid,'Outras entradas','income'),(uid,'Moradia','expense'),(uid,'Alimentação','expense'),
 (uid,'Transporte','expense'),(uid,'Saúde','expense'),(uid,'Lazer','expense'),(uid,'Outras despesas','expense')
 on conflict(user_id,name,kind) do nothing;
 select id into aid from public.accounts where user_id=uid order by created_at,id limit 1;
 if aid is null then
  insert into public.accounts(user_id,name,initial_balance_cents,reference_date) values(uid,p_account_name,p_balance,p_reference) returning id into aid;
 end if;
 return aid;
end $$;

create function public.settle_commitment(p_id uuid,p_account_id uuid,p_occurred_on date) returns uuid
 language plpgsql security invoker set search_path='' as $$
declare c public.commitments; tid uuid;
begin
 select * into c from public.commitments where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Compromisso não encontrado ou sem permissão.'; end if;
 if c.status='settled' then select id into tid from public.transactions where commitment_id=c.id and user_id=auth.uid(); return tid; end if;
 if c.status<>'pending' then raise exception 'Este compromisso foi cancelado.'; end if;
 insert into public.transactions(user_id,account_id,category_id,kind,amount_cents,description,occurred_on,commitment_id)
 values(auth.uid(),p_account_id,c.category_id,c.kind,c.amount_cents,c.description,p_occurred_on,c.id) returning id into tid;
 update public.commitments set status='settled' where id=c.id and user_id=auth.uid();
 return tid;
end $$;
create function public.reverse_settlement(p_id uuid) returns void
 language plpgsql security invoker set search_path='' as $$
declare c public.commitments;
begin
 select * into c from public.commitments where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Compromisso não encontrado ou sem permissão.'; end if;
 if c.status='pending' then return; end if;
 if c.status<>'settled' then raise exception 'Este compromisso foi cancelado.'; end if;
 delete from public.transactions where commitment_id=c.id and user_id=auth.uid();
 update public.commitments set status='pending' where id=c.id and user_id=auth.uid();
end $$;

-- A single stable SQL statement reads one MVCC snapshot for balances and forecasts.
-- JSON aggregation also avoids the PostgREST row limit silently truncating totals.
create function public.get_tato_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'profile',(select to_jsonb(p) from public.profiles p where p.user_id=(select auth.uid())),
  'accounts',coalesce((select jsonb_agg(to_jsonb(a) order by a.id) from public.accounts a where a.user_id=(select auth.uid())),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.categories c where c.user_id=(select auth.uid())),'[]'::jsonb),
  'transactions',coalesce((select jsonb_agg(to_jsonb(t) order by t.id) from public.transactions t where t.user_id=(select auth.uid())),'[]'::jsonb),
  'commitments',coalesce((select jsonb_agg(to_jsonb(c) order by c.id) from public.commitments c where c.user_id=(select auth.uid())),'[]'::jsonb)
 );
$$;
revoke all on function public.get_tato_snapshot() from public,anon;
grant execute on function public.get_tato_snapshot() to authenticated;

revoke all on function public.tato_today(),public.tato_audit(),public.tato_account_guard(),public.tato_transaction_guard(),public.tato_commitment_guard(),public.tato_settlement_integrity(),public.initialize_tato(text,text,bigint,date),public.settle_commitment(uuid,uuid,date),public.reverse_settlement(uuid) from public,anon;
grant execute on function public.tato_today(),public.initialize_tato(text,text,bigint,date),public.settle_commitment(uuid,uuid,date),public.reverse_settlement(uuid) to authenticated;
-- Trigger functions cannot be invoked as ordinary SQL functions.
notify pgrst,'reload schema';
commit;
