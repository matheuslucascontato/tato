/** Real Chromium, isolated React UI + HTTP mocks. No test backdoor in Next routes. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
await mkdir('test-results', { recursive: true });
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
  resolve: {
    alias: {
      '@': path.resolve('src'),
      'next/navigation': path.resolve('tests/ui/router.ts'),
      'next/link': path.resolve('tests/ui/link.tsx'),
    },
  },
  esbuild: { jsx: 'automatic' },
});
await server.listen();
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let proposal,
      confirms = 0,
      paid = 0,
      revisions = 0,
      confirmed = false;
    const actions = [];
    await page.addInitScript(() => {
      window.tatoRefreshCount = 0;
      window.addEventListener('tato-test-refresh', () => window.tatoRefreshCount++);
    });
    await page.route('**/api/tato', async (route) => {
      const c = route.request().postDataJSON();
      actions.push(c.action);
      if (c.action === 'message') {
        paid++;
        if (c.message.includes('sobra'))
          return route.fulfill({
            json: {
              message: 'Confira os cálculos.',
              context: 'mock-context',
              summary: {
                title: 'Folga prevista — estimativa',
                period: 'Até fim do mês atual, incluindo vencidos',
                values: [
                  { label: 'Saldo registrado atual', value: 'R$ 2.350,00' },
                  { label: 'Entradas ainda previstas', value: 'R$ 400,00' },
                  { label: 'Saídas ainda pendentes', value: 'R$ 300,00' },
                  { label: 'Folga estimada', value: 'R$ 2.450,00' },
                ],
                note: 'Estimativa somente do que foi cadastrado.',
              },
            },
          });
        proposal = {
          id: c.request_id,
          version: 1,
          expires_at: new Date(Date.now() + 900000).toISOString(),
          token: 'test-mock-only',
          account_name: 'Carteira de TESTE',
          category_name: 'Alimentação de TESTE',
          content: {
            kind: 'expense',
            amount_cents: 3500,
            description: 'Mercado de TESTE',
            account_id: '50000000-0000-4000-8000-000000000001',
            category_id: '50000000-0000-4000-8000-000000000002',
            occurred_on: '2026-10-28',
          },
        };
        return route.fulfill({
          json: { message: 'Revise antes de confirmar.', context: 'mock-context', proposal },
        });
      }
      if (c.action === 'revise') {
        revisions++;
        proposal = { ...proposal, content: c.content, version: proposal.version + 1 };
        return route.fulfill({ json: { message: 'Revise a nova versão.', proposal } });
      }
      if (c.action === 'confirm') {
        confirms++;
        assert.equal(c.version, 2);
        assert.equal(c.token, proposal.token);
        assert.equal(c.amount_cents, undefined);
        confirmed = true;
        await new Promise((r) => setTimeout(r, 150));
        return route.abort('connectionfailed'); // Lost response AFTER fake commit.
      }
      if (c.action === 'recover') {
        assert.ok(confirmed);
        return route.fulfill({
          json: {
            message: 'Confirmação conferida no banco de TESTE.',
            transaction_id: proposal.id,
            href: '/lancamentos?destaque=' + proposal.id,
          },
        });
      }
      throw new Error('Unexpected mock action');
    });
    await page.goto('http://127.0.0.1:4178/tests/ui/index.html');
    const input = page.getByLabel('Sua mensagem');
    await input.fill('Gastei R$35 no mercado hoje');
    await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await page.getByRole('button', { name: 'Corrigir dados', exact: true }).click();
    await page.getByLabel('Valor (R$)', { exact: true }).fill('40,00');
    await page.getByRole('button', { name: 'Salvar nova versão para revisão' }).click();
    await page.getByText('REVISÃO · VERSÃO 2').waitFor();
    await page
      .getByRole('button', { name: 'Confirmar lançamento', exact: true })
      .evaluate((button) => {
        button.click();
        button.click();
      });
    await page.getByRole('button', { name: 'Verificar tentativa', exact: true }).click();
    await page.getByRole('link', { name: 'Visualizar lançamento', exact: true }).waitFor();
    assert.equal(confirms, 1);
    assert.equal(revisions, 1);
    assert.equal(paid, 1);
    assert.equal(await page.evaluate(() => window.tatoRefreshCount), 1);
    await input.fill('Quanto sobra depois das contas?');
    await page.getByRole('button', { name: 'Enviar mensagem', exact: true }).click();
    await page.getByText('R$ 2.450,00', { exact: true }).waitFor();
    assert.ok(await page.getByRole('heading', { name: 'Folga prevista — estimativa' }).isVisible());
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Não deve transbordar horizontalmente',
    );
    await input.focus();
    await page.keyboard.type('Teste por teclado');
    assert.equal(await input.inputValue(), 'Teste por teclado');
    assert.deepEqual(errors, []);
    assert.deepEqual(actions, ['message', 'revise', 'confirm', 'recover', 'message']);
    await page.screenshot({ path: `test-results/conversa-${viewport.width}.png`, fullPage: true });
    await page.close();
  }
  console.log(
    'PASSOU: Chromium 390px e 1440px, revisão/correção, clique duplo, recuperação de resposta perdida, atalho, atualização, cards e ausência de overflow. UI com dados/HTTP simulados; NÃO é teste integrado de Auth, banco ou OpenAI.',
  );
} finally {
  await browser?.close();
  await server.close();
}
