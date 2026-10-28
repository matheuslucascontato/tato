/** Read-only HTTP checks. Does not create users, sessions, records, or send emails. */
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(url && key, 'Configure as duas variáveis públicas do Supabase.');
assert.equal(
  new URL(url).hostname,
  'mpwmwmbxawbhcngfysko.supabase.co',
  'Este check deve apontar para tato-dev.',
);
assert.ok(key.startsWith('sb_publishable_'), 'Use somente a chave publicável.');
const tables = [
  'profiles',
  'accounts',
  'categories',
  'transactions',
  'commitments',
  'ai_proposals',
];
const report = {
  project: 'tato-dev',
  anonymous: [],
  authSettings: {},
  authenticatedSession: {
    status: 'not_executed',
    reason: 'TATO_TEST_ACCESS_TOKEN ausente; nenhuma sessão foi criada.',
  },
};
async function request(path, token) {
  const response = await fetch(`${url}${path}`, {
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return { status: response.status, data: await response.json() };
}
for (const table of tables) {
  const result = await request(`/rest/v1/${table}?select=user_id&limit=0`);
  assert.ok(
    [401, 403].includes(result.status) && result.data.code === '42501',
    `Acesso anônimo inesperado ou recurso indisponível: ${table} (${result.status}, ${result.data.code})`,
  );
  report.anonymous.push({
    resource: table,
    status: result.status,
    code: result.data.code,
    denied: true,
  });
}
const anonymousSnapshot = await request('/rest/v1/rpc/get_tato_snapshot');
assert.ok(
  [401, 403].includes(anonymousSnapshot.status) && anonymousSnapshot.data.code === '42501',
  'RPC deve recusar acesso anônimo.',
);
report.anonymous.push({
  resource: 'get_tato_snapshot',
  status: anonymousSnapshot.status,
  code: anonymousSnapshot.data.code,
  denied: true,
});
const settings = await request('/auth/v1/settings');
assert.equal(settings.status, 200, 'Não foi possível consultar a configuração pública de Auth.');
report.authSettings = {
  emailEnabled: settings.data.external?.email === true,
  requiresEmailConfirmation: settings.data.mailer_autoconfirm === false,
  signupDisabled: settings.data.disable_signup === true,
};

// The optional token must belong to an EXISTING user authorized for this project.
// No signIn/signUp/refresh call is made, and the token is never logged or written.
const token = process.env.TATO_TEST_ACCESS_TOKEN;
if (token) {
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const auth = await db.auth.getUser(token);
  assert.ok(!auth.error && auth.data.user, 'Token de usuário inválido ou expirado.');
  const uid = auth.data.user.id;
  for (const table of tables) {
    const result = await db.from(table).select('user_id').limit(1);
    assert.ok(!result.error, `Leitura autenticada falhou: ${table} (${result.error?.code})`);
    assert.ok(
      result.data.every((row) => row.user_id === uid),
      `RLS retornou proprietário inesperado: ${table}`,
    );
  }
  const snapshot = await db.rpc('get_tato_snapshot');
  assert.ok(!snapshot.error, `Snapshot autenticado falhou (${snapshot.error?.code})`);
  assert.ok(
    snapshot.data.profile === null || snapshot.data.profile.user_id === uid,
    'Snapshot retornou perfil de outro proprietário.',
  );
  for (const table of tables.filter((t) => !['profiles', 'ai_proposals'].includes(t))) {
    assert.ok(
      Array.isArray(snapshot.data[table]) &&
        snapshot.data[table].every((row) => row.user_id === uid),
      `Snapshot retornou proprietário inesperado: ${table}`,
    );
  }
  report.authenticatedSession = {
    status: 'passed',
    scope: 'getUser, SELECT das seis tabelas e get_tato_snapshot; sem gravações',
  };
}
if (process.env.TATO_ACCESS_REPORT_PATH)
  await writeFile(process.env.TATO_ACCESS_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
    mode: 0o600,
  });
console.log(JSON.stringify(report, null, 2));
