import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
const A = '20000000-0000-4000-8000-000000000001',
  B = '20000000-0000-4000-8000-000000000002';
let db: PGlite;
let accountA: string, accountB: string, catA: string, catB: string, today: string;
async function user<T>(uid: string | null, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx: Transaction) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [uid || '']);
    return (await tx.query<T>(sql, params)).rows;
  });
}
const id = () => crypto.randomUUID();
function content(extra = {}) {
  return {
    kind: 'expense',
    description: 'Teste fictício local',
    amount_cents: 3500,
    account_id: accountA,
    category_id: catA,
    occurred_on: today,
    ...extra,
  };
}
async function prepare(uid = A, fields = {}, proposal = id()) {
  const c = content(fields);
  await user(uid, 'select public.prepare_tato_ai_proposal($1,0,$2)', [proposal, c]);
  return { id: proposal, content: c };
}
async function confirm(p: { id: string; content: object }, uid = A, version = 1) {
  return user<{ tid: string }>(uid, 'select public.confirm_tato_ai_proposal($1,$2,$3) as tid', [
    p.id,
    version,
    p.content,
  ]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${A}'),('${B}');`,
  );
  await db.exec(readFileSync('supabase/migrations/20261028130845_tato_initial.sql', 'utf8'));
  const file = readdirSync('supabase/migrations').find((f) => f.endsWith('_tato_ai_preview.sql'))!;
  await db.exec(readFileSync('supabase/migrations/' + file, 'utf8'));
  today = (await db.query<{ d: string }>('select public.tato_today()::text d')).rows[0].d;
  for (const uid of [A, B])
    await user(uid, 'select public.initialize_tato($1,$2,50000,$3)', [
      'Teste fictício',
      'Carteira',
      today.slice(0, 7) + '-01',
    ]);
  accountA = (await user<{ id: string }>(A, 'select id from public.accounts'))[0].id;
  accountB = (await user<{ id: string }>(B, 'select id from public.accounts'))[0].id;
  catA = (
    await user<{ id: string }>(A, "select id from public.categories where kind='expense' limit 1")
  )[0].id;
  catB = (
    await user<{ id: string }>(B, "select id from public.categories where kind='expense' limit 1")
  )[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe.sequential('migração IA real em PostgreSQL isolado; sem Auth/HTTP real', () => {
  it('mantém contadores privados e papel privilegiado sem poder financeiro', async () => {
    await expect(user(A, 'select * from tato_private.ai_usage')).rejects.toThrow(
      /permission denied/,
    );
    await expect(user(A, 'delete from tato_private.ai_usage')).rejects.toThrow(/permission denied/);
    const r = await db.query<{ finance: boolean; anon: boolean; definer: boolean }>(
      "select has_table_privilege('tato_ai_quota_owner','public.transactions','INSERT') finance,has_function_privilege('anon','public.reserve_tato_ai_usage(uuid,text)','EXECUTE') anon,prosecdef definer from pg_proc where oid='tato_private.reserve_ai(uuid,text)'::regprocedure",
    );
    expect(r.rows[0]).toEqual({ finance: false, anon: false, definer: true });
  });
  it('nega sessões ausentes e relações com conta/categoria de B', async () => {
    await expect(
      user(null, 'select public.reserve_tato_ai_usage($1,$2)', [id(), 'gpt-5.4-mini']),
    ).rejects.toThrow();
    await expect(prepare(A, { account_id: accountB })).rejects.toThrow(/conta/);
    await expect(prepare(A, { category_id: catB })).rejects.toThrow(/categoria/);
  });
  it('A/B não lista, lê, altera, cancela, confirma nem apaga propostas alheias', async () => {
    const p = await prepare();
    expect(await user(B, 'select * from public.ai_proposals where id=$1', [p.id])).toHaveLength(0);
    expect(
      await user(B, "update public.ai_proposals set status='cancelled' where id=$1 returning id", [
        p.id,
      ]),
    ).toHaveLength(0);
    await expect(user(B, 'delete from public.ai_proposals where id=$1', [p.id])).rejects.toThrow();
    await expect(user(B, 'select public.cancel_tato_ai_proposal($1,1)', [p.id])).rejects.toThrow();
    await expect(confirm(p, B)).rejects.toThrow();
    await expect(
      user(B, 'insert into public.ai_proposals(id,user_id,fingerprint) values($1,$2,$3)', [
        id(),
        A,
        'a'.repeat(64),
      ]),
    ).rejects.toThrow();
  });
  it('altera conteúdo só em nova versão, e rejeita versão/conteúdo adulterados', async () => {
    const p = await prepare();
    await expect(confirm({ ...p, content: content({ amount_cents: 1 }) })).rejects.toThrow(
      /alterado/,
    );
    const revised = content({ amount_cents: 4000 });
    await user(A, 'select public.prepare_tato_ai_proposal($1,1,$2)', [p.id, revised]);
    await expect(confirm(p)).rejects.toThrow(/mudou/);
    await confirm({ id: p.id, content: revised }, A, 2);
  });
  it('cancela idempotentemente; não confirma cancelada nem permite reabrir', async () => {
    const p = await prepare();
    await user(A, 'select public.cancel_tato_ai_proposal($1,1)', [p.id]);
    await user(A, 'select public.cancel_tato_ai_proposal($1,1)', [p.id]);
    await expect(confirm(p)).rejects.toThrow(/cancelada/);
    await expect(
      user(A, "update public.ai_proposals set status='pending',version=version+1 where id=$1", [
        p.id,
      ]),
    ).rejects.toThrow(/encerrada/);
  });
  it('expiração bloqueia confirmação e alterações diretas não podem ampliar validade', async () => {
    const p = await prepare();
    await expect(
      user(A, "update public.ai_proposals set expires_at=now()+interval '1 day' where id=$1", [
        p.id,
      ]),
    ).rejects.toThrow(/imutáveis/);
    // Administrator-only clock fixture in this in-memory database, NEVER remote.
    await db.exec('alter table public.ai_proposals disable trigger ai_proposal_guard');
    await db.query(
      "update public.ai_proposals set expires_at=now()-interval '1 minute' where id=$1",
      [p.id],
    );
    await db.exec('alter table public.ai_proposals enable trigger ai_proposal_guard');
    await expect(confirm(p)).rejects.toThrow(/expirada/);
  });
  it('revalida conta arquivada, categoria e data na confirmação, sem estado parcial', async () => {
    const p = await prepare();
    await user(A, 'update public.accounts set archived=true where id=$1', [accountA]);
    await expect(confirm(p)).rejects.toThrow(/conta/);
    expect(await user(A, 'select * from public.transactions where id=$1', [p.id])).toHaveLength(0);
    expect(
      (
        await user<{ status: string }>(A, 'select status from public.ai_proposals where id=$1', [
          p.id,
        ])
      )[0].status,
    ).toBe('pending');
    await user(A, 'update public.accounts set archived=false where id=$1', [accountA]);
    await expect(prepare(A, { occurred_on: '2999-01-01' })).rejects.toThrow(/data/);
  });
  it('confirma duas tentativas concorrentes, recupera após resposta perdida e atualiza snapshot', async () => {
    const p = await prepare();
    const before = (
      await user<{ s: { transactions: unknown[] } }>(A, 'select public.get_tato_snapshot() s')
    )[0].s.transactions.length;
    const results = await Promise.all([confirm(p), confirm(p)]);
    expect(results[0]).toEqual(results[1]);
    expect((await confirm(p))[0].tid).toBe(p.id);
    expect(await user(A, 'select * from public.transactions where id=$1', [p.id])).toHaveLength(1);
    const snap = (
      await user<{ s: { transactions: { id: string; amount_cents: number }[] } }>(
        A,
        'select public.get_tato_snapshot() s',
      )
    )[0].s;
    expect(snap.transactions.length).toBe(before + 1);
    expect(snap.transactions.find((t) => t.id === p.id)?.amount_cents).toBe(3500);
  });
  it('não recria lançamento confirmado excluído pela interface manual', async () => {
    const p = await prepare();
    await confirm(p);
    await user(A, 'delete from public.transactions where id=$1', [p.id]);
    await expect(confirm(p)).rejects.toThrow(/removido/);
    expect(await user(A, 'select * from public.transactions where id=$1', [p.id])).toHaveLength(0);
  });
  it('não aceita confirmação direta sem movimento correspondente', async () => {
    const p = await prepare();
    await expect(
      user(A, "update public.ai_proposals set status='confirmed' where id=$1", [p.id]),
    ).rejects.toThrow(/correspondente/);
  });
  it('reserva uma vez por request ID, inclusive concorrente, e status terminal não libera cota', async () => {
    const rid = id();
    const results = await Promise.all([
      user<{ ok: boolean }>(A, 'select public.reserve_tato_ai_usage($1,$2) ok', [
        rid,
        'gpt-5.4-mini',
      ]),
      user<{ ok: boolean }>(A, 'select public.reserve_tato_ai_usage($1,$2) ok', [
        rid,
        'gpt-5.4-mini',
      ]),
    ]);
    expect(
      results
        .flat()
        .map((r) => r.ok)
        .sort(),
    ).toEqual([false, true]);
    await user(A, "select public.finish_tato_ai_usage($1,'timeout',null,null)", [rid]);
    await expect(
      user(A, "select public.finish_tato_ai_usage($1,'reserved',null,null)", [rid]),
    ).rejects.toThrow();
    expect(
      (
        await user<{ ok: boolean }>(A, 'select public.reserve_tato_ai_usage($1,$2) ok', [
          rid,
          'gpt-5.4-mini',
        ])
      )[0].ok,
    ).toBe(false);
  });
  it('limita 5/minuto mesmo sob Promise.all; PGlite serializa conexões localmente', async () => {
    const r = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        user(A, 'select public.reserve_tato_ai_usage($1,$2)', [id(), 'gpt-5.4-mini']),
      ),
    );
    expect(r.filter((v) => v.status === 'fulfilled')).toHaveLength(4); // one consumed above
    expect(r.filter((v) => v.status === 'rejected')).toHaveLength(4);
  });
  it('limita 20/dia por usuário; datas e contadores são definidos no banco', async () => {
    await db.query(
      "update tato_private.ai_usage set created_at=clock_timestamp()-interval '2 minutes' where user_id=$1",
      [A],
    );
    for (let batch = 0; batch < 3; batch++) {
      for (let n = 0; n < 5; n++)
        await user(A, 'select public.reserve_tato_ai_usage($1,$2)', [id(), 'gpt-5.4-mini']);
      await db.query(
        "update tato_private.ai_usage set created_at=clock_timestamp()-interval '2 minutes' where user_id=$1",
        [A],
      );
    }
    await expect(
      user(A, 'select public.reserve_tato_ai_usage($1,$2)', [id(), 'gpt-5.4-mini']),
    ).rejects.toThrow(/Limite/);
  });
  it('cota global 100/dia é privada e não pode ser resetada pelo cliente', async () => {
    // Synthetic local-only quota fixture for global capacity, not a remote user.
    await db.query(
      "insert into tato_private.ai_usage(user_id,request_id,created_at,day,model) select $1,gen_random_uuid(),clock_timestamp()-interval '2 minutes',public.tato_today(),'mock' from generate_series(1,80)",
      [A],
    );
    await expect(
      user(B, 'select public.reserve_tato_ai_usage($1,$2)', [id(), 'gpt-5.4-mini']),
    ).rejects.toThrow(/pausadas/);
    await expect(user(B, 'update tato_private.ai_usage set day=day-1')).rejects.toThrow(
      /permission denied/,
    );
  });
});
