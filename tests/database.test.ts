import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
const A = '10000000-0000-4000-8000-000000000001';
const B = '10000000-0000-4000-8000-000000000002';
let db: PGlite;
let accountA: string,
  accountB: string,
  catA: string,
  catB: string,
  incomeA: string,
  today: string,
  monthStart: string;
async function asUser<T>(uid: string, sql: string, params: unknown[] = []): Promise<T[]> {
  await db.exec('begin; set local role authenticated;');
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    const r = await db.query<T>(sql, params);
    await db.exec('commit;');
    return r.rows;
  } catch (e) {
    await db.exec('rollback;');
    throw e;
  }
}
async function insertTx(
  uid: string,
  account: string,
  category: string,
  amount: number,
  kind = 'expense',
  date = today,
) {
  return asUser<{ id: string }>(
    uid,
    'insert into public.transactions(user_id,account_id,category_id,kind,amount_cents,description,occurred_on) values($1,$2,$3,$4,$5,$6,$7) returning id',
    [uid, account, category, kind, amount, 'Teste isolado', date],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;insert into auth.users values('${A}'),('${B}');`,
  );
  await db.exec(readFileSync('supabase/migrations/20261028130845_tato_initial.sql', 'utf8'));
  const r = await db.query<{ today: string; start: string }>(
    "select public.tato_today()::text as today,date_trunc('month',public.tato_today())::date::text as start",
  );
  today = r.rows[0].today;
  monthStart = r.rows[0].start;
  for (const uid of [A, B])
    await asUser(uid, 'select public.initialize_tato($1,$2,$3,$4)', [
      'Pessoa de teste',
      'Conta de teste',
      50000,
      monthStart,
    ]);
  accountA = (await asUser<{ id: string }>(A, 'select id from public.accounts'))[0].id;
  accountB = (await asUser<{ id: string }>(B, 'select id from public.accounts'))[0].id;
  catA = (
    await asUser<{ id: string }>(A, "select id from public.categories where kind='expense' limit 1")
  )[0].id;
  catB = (
    await asUser<{ id: string }>(B, "select id from public.categories where kind='expense' limit 1")
  )[0].id;
  incomeA = (
    await asUser<{ id: string }>(A, "select id from public.categories where kind='income' limit 1")
  )[0].id;
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe.sequential('migração real em PostgreSQL isolado (PGlite), RLS e transações', () => {
  it('cria estrutura, grants e onboarding idempotente', async () => {
    await asUser(A, 'select public.initialize_tato($1,$2,$3,$4)', [
      'Pessoa A',
      'Conta repetida',
      50000,
      monthStart,
    ]);
    expect(await asUser(A, 'select id from public.accounts')).toHaveLength(1);
    expect(await asUser(A, 'select id from public.categories')).toHaveLength(8);
  });
  it('impede B de listar, ler por ID, editar ou apagar dados de A', async () => {
    const transaction = (await insertTx(A, accountA, catA, 100))[0].id;
    const commitment = (
      await asUser<{ id: string }>(
        A,
        'insert into public.commitments(user_id,category_id,kind,amount_cents,description,due_on,status) values($1,$2,$3,100,$4,$5,$6) returning id',
        [A, catA, 'expense', 'Teste isolamento', today, 'cancelled'],
      )
    )[0].id;
    for (const [table, id, key, patch] of [
      ['profiles', A, 'user_id', "display_name='Intrusão'"],
      ['accounts', accountA, 'id', "name='Intrusão'"],
      ['categories', catA, 'id', "name='Intrusão'"],
      ['transactions', transaction, 'id', "description='Intrusão'"],
      ['commitments', commitment, 'id', "description='Intrusão'"],
    ]) {
      expect(await asUser(B, `select * from public.${table} where user_id=$1`, [A])).toHaveLength(
        0,
      );
      expect(await asUser(B, `select * from public.${table} where ${key}=$1`, [id])).toHaveLength(
        0,
      );
      expect(
        await asUser(B, `update public.${table} set ${patch} where ${key}=$1 returning *`, [id]),
      ).toHaveLength(0);
      if (table === 'transactions')
        expect(
          await asUser(B, `delete from public.${table} where ${key}=$1 returning *`, [id]),
        ).toHaveLength(0);
      else
        await expect(
          asUser(B, `delete from public.${table} where ${key}=$1`, [id]),
        ).rejects.toThrow();
    }
    await expect(
      asUser(A, 'update public.transactions set user_id=$1 where id=$2', [B, transaction]),
    ).rejects.toThrow();
    await asUser(A, 'delete from public.transactions where id=$1', [transaction]);
    await expect(
      asUser(
        B,
        'insert into public.accounts(user_id,name,initial_balance_cents,reference_date) values($1,$2,0,$3)',
        [A, 'Intrusão', today],
      ),
    ).rejects.toThrow();
  });
  it('rejeita relações cruzadas, categoria de tipo incorreto e conta inexistente', async () => {
    await expect(insertTx(B, accountA, catB, 100)).rejects.toThrow();
    await expect(insertTx(B, accountB, catA, 100)).rejects.toThrow();
    await expect(insertTx(A, accountA, incomeA, 100)).rejects.toThrow();
    await expect(
      asUser(
        B,
        'insert into public.commitments(user_id,account_id,category_id,kind,amount_cents,description,due_on) values($1,$2,$3,$4,100,$5,$6)',
        [B, accountA, catB, 'expense', 'Intrusão', today],
      ),
    ).rejects.toThrow();
  });
  it('aceita saldo negativo e bloqueia datas inválidas, valor zero e alteração retroativa da referência', async () => {
    const row = (
      await asUser<{ id: string }>(
        A,
        'insert into public.accounts(user_id,name,initial_balance_cents,reference_date) values($1,$2,-5000,$3) returning id',
        [A, 'Negativa', today],
      )
    )[0];
    await expect(insertTx(A, row.id, catA, 100, 'expense', '1900-01-01')).rejects.toThrow();
    await expect(insertTx(A, row.id, catA, 100, 'expense', '2099-01-01')).rejects.toThrow();
    await expect(insertTx(A, row.id, catA, 0)).rejects.toThrow();
    await insertTx(A, row.id, catA, 100);
    await expect(
      asUser(A, 'update public.accounts set initial_balance_cents=0 where id=$1', [row.id]),
    ).rejects.toThrow();
  });
  it('edita e exclui lançamento comum e preserva conta arquivada', async () => {
    const id = (await insertTx(A, accountA, catA, 100))[0].id;
    await asUser(A, 'update public.transactions set amount_cents=250 where id=$1', [id]);
    expect(
      (
        await asUser<{ amount_cents: number }>(
          A,
          'select amount_cents from public.transactions where id=$1',
          [id],
        )
      )[0].amount_cents,
    ).toBe(250);
    await asUser(A, 'delete from public.transactions where id=$1', [id]);
    expect(await asUser(A, 'select id from public.transactions where id=$1', [id])).toHaveLength(0);
    await asUser(A, 'update public.accounts set archived=true where id=$1', [accountA]);
    await expect(insertTx(A, accountA, catA, 100)).rejects.toThrow();
    expect(await asUser(A, 'select id from public.accounts where id=$1', [accountA])).toHaveLength(
      1,
    );
    await asUser(A, 'update public.accounts set archived=false where id=$1', [accountA]);
  });
  it('quita uma única vez, impede vínculo inconsistente e estorna atomicamente', async () => {
    await insertTx(A, accountA, incomeA, 200000, 'income');
    await insertTx(A, accountA, catA, 15000);
    const cid = (
      await asUser<{ id: string }>(
        A,
        'insert into public.commitments(user_id,category_id,kind,amount_cents,description,due_on) values($1,$2,$3,30000,$4,$5) returning id',
        [A, catA, 'expense', 'Conta teste', monthStart],
      )
    )[0].id;
    await asUser(
      A,
      'insert into public.commitments(user_id,category_id,kind,amount_cents,description,due_on) values($1,$2,$3,40000,$4,$5)',
      [A, incomeA, 'income', 'Entrada teste', today],
    );
    const amounts = async () => {
      const rows = await asUser<{ balance: string; projected: string }>(
        A,
        `with bal as (select a.initial_balance_cents+coalesce(sum(case when t.kind='income' then t.amount_cents else -t.amount_cents end),0) as value from public.accounts a left join public.transactions t on t.account_id=a.id where a.id=$1 group by a.id), pending as (select coalesce(sum(case when kind='income' then amount_cents else -amount_cents end),0) value from public.commitments where user_id=$2 and status='pending' and due_on <= (date_trunc('month',public.tato_today())+interval '1 month - 1 day')::date) select bal.value::text balance,(bal.value+pending.value)::text projected from bal,pending`,
        [accountA, A],
      );
      return rows[0];
    };
    expect(await amounts()).toEqual({ balance: '235000', projected: '245000' });
    await expect(
      asUser(B, 'select public.settle_commitment($1,$2,$3)', [cid, accountB, today]),
    ).rejects.toThrow();
    await expect(
      asUser(A, 'select public.settle_commitment($1,$2,$3)', [cid, accountB, today]),
    ).rejects.toThrow();
    expect(
      (
        await asUser<{ status: string }>(A, 'select status from public.commitments where id=$1', [
          cid,
        ])
      )[0].status,
    ).toBe('pending');
    const paid = await asUser<{ id: string }>(A, 'select public.settle_commitment($1,$2,$3) id', [
      cid,
      accountA,
      today,
    ]);
    expect(await amounts()).toEqual({ balance: '205000', projected: '245000' });
    const again = await asUser<{ id: string }>(A, 'select public.settle_commitment($1,$2,$3) id', [
      cid,
      accountA,
      today,
    ]);
    expect(again).toEqual(paid);
    expect(await amounts()).toEqual({ balance: '205000', projected: '245000' });
    await expect(
      asUser(A, 'delete from public.transactions where id=$1', [paid[0].id]),
    ).rejects.toThrow();
    await expect(
      asUser(A, 'update public.transactions set amount_cents=10 where id=$1', [paid[0].id]),
    ).rejects.toThrow();
    await expect(
      asUser(A, "update public.commitments set status='pending' where id=$1", [cid]),
    ).rejects.toThrow();
    await expect(asUser(B, 'select public.reverse_settlement($1)', [cid])).rejects.toThrow();
    await asUser(A, 'select public.reverse_settlement($1)', [cid]);
    expect(await amounts()).toEqual({ balance: '235000', projected: '245000' });
    await asUser(A, 'select public.reverse_settlement($1)', [cid]);
    expect(await amounts()).toEqual({ balance: '235000', projected: '245000' });
    await asUser(A, "update public.commitments set status='cancelled' where id=$1", [cid]);
    await expect(
      asUser(A, 'select public.settle_commitment($1,$2,$3)', [cid, accountA, today]),
    ).rejects.toThrow();
  });
  it('lê o snapshot em uma única RPC, limitado ao proprietário', async () => {
    const rows = await asUser<{
      snapshot: {
        accounts: { user_id: string }[];
        transactions: { user_id: string }[];
        commitments: { user_id: string }[];
      };
    }>(B, 'select public.get_tato_snapshot() as snapshot');
    expect(rows[0].snapshot.accounts).toHaveLength(1);
    for (const table of ['accounts', 'transactions', 'commitments'] as const)
      expect(rows[0].snapshot[table].every((row) => row.user_id === B)).toBe(true);
  });
  it('não dá acesso financeiro anônimo', async () => {
    await db.exec('begin;set local role anon;');
    try {
      await expect(db.query('select * from public.accounts')).rejects.toThrow();
      await expect(db.query('select public.get_tato_snapshot()')).rejects.toThrow();
    } finally {
      await db.exec('rollback;');
    }
  });
});
