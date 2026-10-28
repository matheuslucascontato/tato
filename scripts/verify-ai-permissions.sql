-- Read-only catalog check. Does NOT impersonate a real Auth/HTTP session.
begin read only;
do $$
declare f regprocedure;
begin
 if not (select relrowsecurity from pg_class where oid='public.ai_proposals'::regclass)
 or not (select relrowsecurity from pg_class where oid='tato_private.ai_usage'::regclass) then raise exception 'RLS required'; end if;
 if (select count(*) from pg_policies where schemaname='public' and tablename='ai_proposals')<>3 then raise exception 'Proposal policies missing'; end if;
 if has_table_privilege('anon','public.ai_proposals','SELECT') or has_table_privilege('authenticated','public.ai_proposals','DELETE')
 or has_table_privilege('authenticated','tato_private.ai_usage','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('tato_ai_quota_owner','public.transactions','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege('tato_ai_quota_owner','public.ai_proposals','SELECT,INSERT,UPDATE,DELETE') then raise exception 'Unexpected grant'; end if;
 if pg_has_role('authenticated','tato_ai_quota_owner','MEMBER') or pg_has_role('anon','tato_ai_quota_owner','MEMBER') then raise exception 'Quota role membership leak'; end if;
 foreach f in array array['public.prepare_tato_ai_proposal(uuid,integer,jsonb)'::regprocedure,'public.confirm_tato_ai_proposal(uuid,integer,jsonb)'::regprocedure,'public.cancel_tato_ai_proposal(uuid,integer)'::regprocedure,'public.reserve_tato_ai_usage(uuid,text)'::regprocedure,'public.finish_tato_ai_usage(uuid,text,integer,integer)'::regprocedure] loop
  if has_function_privilege('anon',f,'EXECUTE') or not has_function_privilege('authenticated',f,'EXECUTE') then raise exception 'RPC grant mismatch'; end if;
  if (select prosecdef from pg_proc where oid=f) or not (select coalesce(proconfig @> array['search_path=""'],false) from pg_proc where oid=f) then raise exception 'Public RPC must be invoker with fixed search_path'; end if;
 end loop;
 if (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='tato_private' and p.proname in ('reserve_ai','finish_ai') and p.prosecdef and p.proowner='tato_ai_quota_owner'::regrole and coalesce(p.proconfig @> array['search_path=""'],false))<>2 then raise exception 'Quota function scope mismatch'; end if;
 if (select rolcanlogin or rolcreaterole or rolcreatedb or rolbypassrls or rolsuper from pg_roles where rolname='tato_ai_quota_owner') then raise exception 'Quota role must be unprivileged NOLOGIN'; end if;
end $$;
rollback;
select true as ai_catalog_checks_passed, 'Catalog only; real Auth/HTTP A/B remains a separate test' as scope;
