/** Direct Supabase HTTP checks. Only pre-created, confirmed users of an isolated test project. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const names = [
  'TATO_TEST_SUPABASE_URL',
  'TATO_TEST_SUPABASE_KEY',
  'TATO_TEST_EMAIL_A',
  'TATO_TEST_PASSWORD_A',
  'TATO_TEST_EMAIL_B',
  'TATO_TEST_PASSWORD_B',
];
if (names.some((k) => !process.env[k])) {
  console.log(
    'NÃO EXECUTADO: configure as seis variáveis TATO_TEST_* documentadas no README. Nenhum usuário ou dado foi criado.',
  );
  process.exit(0);
}
const url = new URL(process.env.TATO_TEST_SUPABASE_URL);
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) &&
  process.env.TATO_TEST_ALLOW_REMOTE !== 'isolated-test-project'
)
  throw new Error(
    'Use um Supabase local ou confirme um projeto EXCLUSIVO de testes com TATO_TEST_ALLOW_REMOTE=isolated-test-project. Nunca use o banco de pessoas reais.',
  );
assert.notEqual(
  process.env.TATO_TEST_EMAIL_A,
  process.env.TATO_TEST_EMAIL_B,
  'São necessários dois usuários diferentes.',
);
const client = () =>
  createClient(url.href, process.env.TATO_TEST_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const a = client(),
  b = client();
async function ok(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`Falha ${error.code || ''}: ${error.message}`);
  return data;
}
async function rejected(promise) {
  const { error } = await promise;
  assert.ok(error, 'Operação proibida deveria falhar.');
}
const ua = await ok(
  a.auth.signInWithPassword({
    email: process.env.TATO_TEST_EMAIL_A,
    password: process.env.TATO_TEST_PASSWORD_A,
  }),
);
const ub = await ok(
  b.auth.signInWithPassword({
    email: process.env.TATO_TEST_EMAIL_B,
    password: process.env.TATO_TEST_PASSWORD_B,
  }),
);
const aid = ua.user.id,
  bid = ub.user.id;
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts();
const get = (t) => parts.find((p) => p.type === t).value;
const today = `${get('year')}-${get('month')}-${get('day')}`,
  ref = today.slice(0, 7) + '-01';
const suffix = randomUUID().slice(0, 8);
await ok(
  a.rpc('initialize_tato', {
    p_name: 'Pessoa A de teste',
    p_account_name: `TESTE ${suffix} A`,
    p_balance: 50000,
    p_reference: ref,
  }),
);
await ok(
  b.rpc('initialize_tato', {
    p_name: 'Pessoa B de teste',
    p_account_name: `TESTE ${suffix} B`,
    p_balance: 0,
    p_reference: ref,
  }),
);
const accountA = await ok(
  a
    .from('accounts')
    .insert({
      user_id: aid,
      name: `TESTE cenário ${suffix}`,
      initial_balance_cents: 50000,
      reference_date: ref,
    })
    .select()
    .single(),
);
const accountB = await ok(b.from('accounts').select().limit(1).single());
const categoriesA = await ok(a.from('categories').select());
const categoriesB = await ok(b.from('categories').select());
const expenseA = categoriesA.find((c) => c.kind === 'expense').id,
  incomeA = categoriesA.find((c) => c.kind === 'income').id,
  expenseB = categoriesB.find((c) => c.kind === 'expense').id;
const tx = {
  user_id: aid,
  account_id: accountA.id,
  category_id: incomeA,
  kind: 'income',
  amount_cents: 200000,
  description: `TESTE salário ${suffix}`,
  occurred_on: today,
};
const salary = await ok(a.from('transactions').insert(tx).select().single());
await ok(
  a.from('transactions').insert({
    ...tx,
    kind: 'expense',
    category_id: expenseA,
    amount_cents: 15000,
    description: `TESTE despesa ${suffix}`,
  }),
);
const commitment = await ok(
  a
    .from('commitments')
    .insert({
      user_id: aid,
      category_id: expenseA,
      account_id: accountA.id,
      kind: 'expense',
      amount_cents: 30000,
      description: `TESTE conta ${suffix}`,
      due_on: ref,
    })
    .select()
    .single(),
);
const incoming = await ok(
  a
    .from('commitments')
    .insert({
      user_id: aid,
      category_id: incomeA,
      account_id: accountA.id,
      kind: 'income',
      amount_cents: 40000,
      description: `TESTE entrada ${suffix}`,
      due_on: today,
    })
    .select()
    .single(),
);
for (const [table, id, key, patch] of [
  ['profiles', aid, 'user_id', { display_name: 'Intrusão' }],
  ['accounts', accountA.id, 'id', { name: 'Intrusão' }],
  ['categories', expenseA, 'id', { name: 'Intrusão' }],
  ['transactions', salary.id, 'id', { description: 'Intrusão' }],
  ['commitments', commitment.id, 'id', { description: 'Intrusão' }],
]) {
  assert.equal(
    (await ok(b.from(table).select().eq('user_id', aid))).length,
    0,
    `${table}: listagem vazou dados`,
  );
  assert.equal(
    (await ok(b.from(table).select().eq(key, id))).length,
    0,
    `${table}: leitura por ID vazou dados`,
  );
  assert.equal(
    (await ok(b.from(table).update(patch).eq(key, id).select())).length,
    0,
    `${table}: alteração indevida`,
  );
  const deleted = await b.from(table).delete().eq(key, id).select();
  assert.ok(deleted.error || deleted.data.length === 0, `${table}: exclusão indevida`);
}
await rejected(
  b.from('transactions').insert({ ...tx, user_id: bid, category_id: expenseB, kind: 'expense' }),
);
await rejected(
  b.from('transactions').insert({
    ...tx,
    user_id: bid,
    account_id: accountB.id,
    category_id: expenseA,
    kind: 'expense',
  }),
);
await rejected(
  b.from('commitments').insert({
    user_id: bid,
    account_id: accountA.id,
    category_id: expenseB,
    kind: 'expense',
    amount_cents: 100,
    description: 'TESTE relação cruzada',
    due_on: today,
  }),
);
await rejected(
  b.rpc('settle_commitment', {
    p_id: commitment.id,
    p_account_id: accountB.id,
    p_occurred_on: today,
  }),
);
await rejected(
  a.rpc('settle_commitment', {
    p_id: commitment.id,
    p_account_id: accountB.id,
    p_occurred_on: today,
  }),
);
async function totals() {
  const rows = await ok(a.from('transactions').select().eq('account_id', accountA.id));
  const pending = await ok(
    a.from('commitments').select().in('id', [commitment.id, incoming.id]).eq('status', 'pending'),
  );
  const balance = rows.reduce(
    (s, t) => s + BigInt(t.amount_cents) * (t.kind === 'income' ? 1n : -1n),
    50000n,
  );
  return {
    balance,
    projected: pending.reduce(
      (s, c) => s + BigInt(c.amount_cents) * (c.kind === 'income' ? 1n : -1n),
      balance,
    ),
  };
}
assert.deepEqual(await totals(), { balance: 235000n, projected: 245000n });
const args = { p_id: commitment.id, p_account_id: accountA.id, p_occurred_on: today };
// Two simultaneous HTTP requests must return the same movement.
const [one, two] = await Promise.all([
  ok(a.rpc('settle_commitment', args)),
  ok(a.rpc('settle_commitment', args)),
]);
assert.equal(one, two);
assert.deepEqual(await totals(), { balance: 205000n, projected: 245000n });
await ok(a.rpc('settle_commitment', args));
assert.deepEqual(await totals(), { balance: 205000n, projected: 245000n });
await rejected(a.from('transactions').delete().eq('id', one));
await rejected(a.from('transactions').update({ amount_cents: 1 }).eq('id', one));
await rejected(b.rpc('reverse_settlement', { p_id: commitment.id }));
await ok(a.rpc('reverse_settlement', { p_id: commitment.id }));
assert.deepEqual(await totals(), { balance: 235000n, projected: 245000n });
console.log(
  `PASSOU: RLS via HTTP, relações, autorização de RPC, quitação concorrente/idempotente e estorno. Fixtures TESTE ${suffix} mantidas apenas no ambiente de testes.`,
);
await a.auth.signOut();
await b.auth.signOut();
