/** Real Auth/PostgREST A/B and concurrency. No OpenAI, signup, email or admin key. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const keys = [
  'TATO_TEST_SUPABASE_URL',
  'TATO_TEST_SUPABASE_KEY',
  'TATO_TEST_EMAIL_A',
  'TATO_TEST_PASSWORD_A',
  'TATO_TEST_EMAIL_B',
  'TATO_TEST_PASSWORD_B',
];
if (keys.some((k) => !process.env[k])) {
  console.log(
    'NÃO EXECUTADO: faltam sessões/credenciais de dois usuários confirmados em Supabase isolado. Nenhum usuário, e-mail, chamada OpenAI ou dado remoto foi criado.',
  );
  process.exit(0);
}
const url = new URL(process.env.TATO_TEST_SUPABASE_URL);
assert.notEqual(
  url.hostname,
  'mpwmwmbxawbhcngfysko.supabase.co',
  'tato-dev contém dados existentes e não é banco isolado para fixtures.',
);
assert.ok(
  ['127.0.0.1', 'localhost'].includes(url.hostname) ||
    process.env.TATO_TEST_ALLOW_REMOTE === 'isolated-test-project',
  'Use somente Supabase isolado.',
);
assert.notEqual(process.env.TATO_TEST_EMAIL_A, process.env.TATO_TEST_EMAIL_B);
const clients = [0, 1].map(() =>
  createClient(url.href, process.env.TATO_TEST_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
);
const [a, b] = clients;
const ok = async (promise) => {
  const { data, error } = await promise;
  assert.equal(error, null, `Operação falhou (${error?.code || ''}).`);
  return data;
};
const denied = async (promise) => {
  const { data, error } = await promise;
  assert.ok(
    error || (Array.isArray(data) && data.length === 0),
    'Operação alheia deveria ser negada.',
  );
};
const sessions = await Promise.all(
  clients.map((c, i) =>
    ok(
      c.auth.signInWithPassword({
        email: process.env[`TATO_TEST_EMAIL_${i ? 'B' : 'A'}`],
        password: process.env[`TATO_TEST_PASSWORD_${i ? 'B' : 'A'}`],
      }),
    ),
  ),
);
const [aid, bid] = sessions.map((s) => s.user.id);
const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts();
const part = (t) => parts.find((p) => p.type === t).value;
const today = `${part('year')}-${part('month')}-${part('day')}`;
for (const c of clients)
  await ok(
    c.rpc('initialize_tato', {
      p_name: 'TESTE IA isolado',
      p_account_name: 'TESTE IA Carteira',
      p_balance: 0,
      p_reference: today.slice(0, 7) + '-01',
    }),
  );
const account = await ok(
  a
    .from('accounts')
    .insert({
      id: randomUUID(),
      user_id: aid,
      name: 'TESTE IA HTTP',
      initial_balance_cents: 0,
      reference_date: today,
    })
    .select()
    .single(),
);
const otherAccount = (await ok(b.from('accounts').select().eq('user_id', bid).limit(1)))[0];
const category = (await ok(a.from('categories').select().eq('kind', 'expense').limit(1)))[0];
const otherCategory = (await ok(b.from('categories').select().eq('kind', 'expense').limit(1)))[0];
const content = {
  kind: 'expense',
  description: 'TESTE IA HTTP fictício',
  amount_cents: 3500,
  account_id: account.id,
  category_id: category.id,
  occurred_on: today,
};
const id = randomUUID();
await ok(a.rpc('prepare_tato_ai_proposal', { p_id: id, p_version: 0, p_content: content }));
await denied(b.from('ai_proposals').select().eq('id', id));
await denied(b.from('ai_proposals').update({ status: 'cancelled' }).eq('id', id).select());
await denied(b.from('ai_proposals').delete().eq('id', id));
await denied(b.rpc('confirm_tato_ai_proposal', { p_id: id, p_version: 1, p_content: content }));
await denied(b.rpc('cancel_tato_ai_proposal', { p_id: id, p_version: 1 }));
await denied(
  b.rpc('prepare_tato_ai_proposal', { p_id: randomUUID(), p_version: 0, p_content: content }),
);
for (const change of [{ account_id: otherAccount.id }, { category_id: otherCategory.id }])
  await denied(
    a.rpc('prepare_tato_ai_proposal', {
      p_id: randomUUID(),
      p_version: 0,
      p_content: { ...content, ...change },
    }),
  );
await denied(
  a.rpc('confirm_tato_ai_proposal', {
    p_id: id,
    p_version: 1,
    p_content: { ...content, amount_cents: 1 },
  }),
);
const confirmation = () =>
  a.rpc('confirm_tato_ai_proposal', { p_id: id, p_version: 1, p_content: content });
assert.deepEqual(await Promise.all([ok(confirmation()), ok(confirmation())]), [id, id]);
assert.equal(await ok(confirmation()), id); // Lost-response replay
assert.equal((await ok(a.from('transactions').select('id').eq('id', id))).length, 1);
assert.ok((await ok(a.rpc('get_tato_snapshot', {}))).transactions.some((t) => t.id === id));
const request = randomUUID();
const duplicates = await Promise.all([
  ok(a.rpc('reserve_tato_ai_usage', { p_request: request, p_model: 'mock-http-no-paid-call' })),
  ok(a.rpc('reserve_tato_ai_usage', { p_request: request, p_model: 'mock-http-no-paid-call' })),
]);
assert.deepEqual(duplicates.sort(), [false, true]);
await ok(
  a.rpc('finish_tato_ai_usage', {
    p_request: request,
    p_status: 'timeout',
    p_input: null,
    p_output: null,
  }),
);
assert.equal(
  await ok(
    a.rpc('reserve_tato_ai_usage', { p_request: request, p_model: 'mock-http-no-paid-call' }),
  ),
  false,
);
const quota = await Promise.all(
  Array.from({ length: 8 }, () =>
    a.rpc('reserve_tato_ai_usage', { p_request: randomUUID(), p_model: 'mock-http-no-paid-call' }),
  ),
);
// Requires fresh daily test users (no earlier IA reservations this minute/day).
assert.equal(
  quota.filter((r) => !r.error && r.data === true).length,
  4,
  'Use usuários de teste com cota disponível.',
);
await denied(
  a.rpc('finish_tato_ai_usage', {
    p_request: request,
    p_status: 'reserved',
    p_input: null,
    p_output: null,
  }),
);
console.log(
  'PASSOU: HTTP Auth A/B, relações cruzadas, proposta adulterada, confirmação concorrente/idempotente, snapshot e reserva concorrente. Nenhuma chamada OpenAI ou e-mail. Fixtures TESTE permanecem apenas no banco isolado.',
);
