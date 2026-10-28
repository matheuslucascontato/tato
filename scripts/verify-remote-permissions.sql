-- Read-only checks for tato-dev after applying its versioned migration.
-- This simulates a database role. It does not create a Supabase Auth session.
begin read only;
do $checks$
declare
  tbl text;
  rpc text;
  oid_value oid;
  policy_count integer;
begin
  foreach tbl in array array['profiles','accounts','categories','transactions','commitments'] loop
    oid_value := to_regclass('public.' || tbl);
    if oid_value is null then raise exception 'Missing table: %', tbl; end if;
    if not (select relrowsecurity from pg_class where oid=oid_value) then
      raise exception 'RLS disabled: %', tbl;
    end if;
    if not (has_table_privilege('authenticated',oid_value,'SELECT')
      and has_table_privilege('authenticated',oid_value,'INSERT')
      and has_table_privilege('authenticated',oid_value,'UPDATE')) then
      raise exception 'Required authenticated grants missing: %', tbl;
    end if;
    if has_table_privilege('authenticated',oid_value,'DELETE') <> (tbl='transactions') then
      raise exception 'Unexpected DELETE grant: %', tbl;
    end if;
    if has_table_privilege('anon',oid_value,'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'Anonymous access must be denied: %', tbl;
    end if;
    select count(*) into policy_count from pg_policies
      where schemaname='public' and tablename=tbl and roles=array['authenticated']::name[];
    if policy_count<>4 then raise exception 'Expected four owner policies: %', tbl; end if;
    if not exists(select 1 from pg_policies where schemaname='public' and tablename=tbl and cmd='UPDATE'
      and qual like '%auth.uid()%' and with_check like '%auth.uid()%') then
      raise exception 'UPDATE must check existing and new ownership: %', tbl;
    end if;
  end loop;
  foreach rpc in array array[
    'public.get_tato_snapshot()', 'public.tato_today()',
    'public.initialize_tato(text,text,bigint,date)',
    'public.settle_commitment(uuid,uuid,date)', 'public.reverse_settlement(uuid)'
  ] loop
    oid_value := to_regprocedure(rpc);
    if oid_value is null then raise exception 'Missing function: %', rpc; end if;
    if (select prosecdef from pg_proc where oid=oid_value) then
      raise exception 'Application function must use SECURITY INVOKER: %', rpc;
    end if;
    if (select proconfig @> array['search_path=""'] from pg_proc where oid=oid_value) is not true then
      raise exception 'Application function requires a fixed search_path: %', rpc;
    end if;
    if not has_function_privilege('authenticated',oid_value,'EXECUTE') or has_function_privilege('anon',oid_value,'EXECUTE') then
      raise exception 'Unexpected function grants: %', rpc;
    end if;
  end loop;
end
$checks$;
set local role authenticated;
-- An unassigned identity is enough to verify reads remain scoped to this identity.
-- It is not inserted into auth.users and is not a real JWT/session.
set local "request.jwt.claim.sub" = 'f7777777-7777-4777-8777-777777777777';
set local "request.jwt.claims" = '{"sub":"f7777777-7777-4777-8777-777777777777","role":"authenticated"}';
do $checks$
declare snapshot jsonb; tbl text; row_count bigint;
begin
  if current_user <> 'authenticated' or auth.uid()::text is distinct from 'f7777777-7777-4777-8777-777777777777' then
    raise exception 'Role/claim context was not established';
  end if;
  foreach tbl in array array['profiles','accounts','categories','transactions','commitments'] loop
    execute format('select count(*) from public.%I',tbl) into row_count;
    if row_count<>0 then raise exception 'Unexpected rows for an unassigned identity: %',tbl; end if;
  end loop;
  snapshot := public.get_tato_snapshot();
  if snapshot->'profile' is distinct from 'null'::jsonb then raise exception 'Profile ownership leak'; end if;
  foreach tbl in array array['accounts','categories','transactions','commitments'] loop
    if jsonb_array_length(snapshot->tbl) is distinct from 0 then raise exception 'Snapshot ownership leak: %',tbl; end if;
  end loop;
  perform public.tato_today();
end
$checks$;
rollback;
select true as permission_checks_passed, 'SQL authenticated role only; not a real Auth session' as verification_scope;
