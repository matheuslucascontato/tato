/** Chromium + real redesigned components, isolated data and server-action mocks. No remote writes/AI. */
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
const root = process.cwd();
await mkdir('test-results/redesign', { recursive: true });
const server = await createServer({
  configFile: false,
  root,
  server: { host: '127.0.0.1', port: 4179, strictPort: true },
  resolve: {
    alias: {
      '@/app/actions': path.resolve('tests/ui/actions.ts'),
      'next/image': path.resolve('tests/ui/image.tsx'),
      'next/navigation': path.resolve('tests/ui/router.ts'),
      'next/link': path.resolve('tests/ui/link.tsx'),
      '@': path.resolve('src'),
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
  for (const size of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    const page = await browser.newPage({ viewport: size, locale: 'pt-BR' });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let posts = 0,
      failNext = false;
    const ids = [];
    await page.route('**/__test__/save', async (route) => {
      posts++;
      const { values } = route.request().postDataJSON();
      ids.push(values.id);
      await new Promise((r) => setTimeout(r, 180));
      if (failNext) {
        failNext = false;
        return route.fulfill({
          json: {
            error: 'Não foi possível salvar nesta tentativa simulada. Revise e tente novamente.',
          },
        });
      }
      const parts = values.amount_cents.replaceAll('.', '').split(',');
      const cents = Number(BigInt(parts[0]) * 100n + BigInt((parts[1] || '').padEnd(2, '0')));
      return route.fulfill({
        json: {
          success: 'Lançamento registrado (servidor simulado).',
          destination: '/lancamentos',
          saved: {
            ...values,
            amount_cents: cents,
            user_id: '60000000-0000-4000-8000-000000000001',
            commitment_id: null,
            created_at: '2026-10-30T15:00:00Z',
            updated_at: '2026-10-30T15:00:00Z',
          },
        },
      });
    });
    await page.goto('http://127.0.0.1:4179/tests/ui/redesign.html?view=painel');
    await page.getByRole('heading', { name: 'Olá, Pessoa.' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(
      await page.evaluate(() =>
        ['Inter', 'Manrope'].every((name) =>
          [...document.fonts].some(
            (face) => face.family.includes(name) && face.status === 'loaded',
          ),
        ),
      ),
      'Fontes locais precisam carregar.',
    );
    await page.locator('.tato-mascot').first().waitFor();
    assert.ok(await page.getByText('R$ 2.450,00', { exact: true }).first().isVisible());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: `test-results/redesign/painel-${size.width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
    assert.equal(await page.getByText('R$ 2.450,00', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Mostrar valores', exact: true }).click();
    await page.getByRole('button', { name: 'Registrar gasto', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Registrar lançamento' });
    await dialog.waitFor();
    await dialog.evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {})));
    });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.ok(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
        'Foco deve ficar dentro do painel modal.',
      );
    }
    await page.getByRole('radio', { name: 'Despesa realizada', exact: true }).check();
    await dialog.getByLabel('Valor (R$)', { exact: true }).fill('35,00');
    await dialog.getByLabel('Descrição', { exact: true }).fill('Gasto fictício do redesign');
    await dialog.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Alimentação' });
    await page.screenshot({
      path: `test-results/redesign/registro-${size.width}.png`,
      fullPage: false,
    });
    page.once('dialog', (d) => d.dismiss());
    await page.keyboard.press('Escape');
    assert.ok(await dialog.isVisible());
    assert.equal(posts, 0);
    failNext = true;
    await dialog.getByRole('button', { name: 'Salvar lançamento', exact: true }).click();
    await page.keyboard.press('Escape');
    assert.ok(await dialog.isVisible());
    await dialog.getByRole('alert').waitFor();
    assert.equal(
      await dialog.getByLabel('Descrição', { exact: true }).inputValue(),
      'Gasto fictício do redesign',
    );
    assert.equal(await dialog.getByLabel('Valor (R$)', { exact: true }).inputValue(), '35,00');
    await dialog.getByRole('button', { name: 'Salvar lançamento', exact: true }).evaluate((b) => {
      b.click();
      b.click();
    });
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(posts, 2);
    assert.equal(new Set(ids).size, 1, 'Reenvio do mesmo rascunho precisa preservar o UUID.');
    await page.getByText('R$ 2.415,00', { exact: true }).first().waitFor();
    assert.ok(
      await page
        .getByRole('button', { name: 'Registrar gasto', exact: true })
        .evaluate((b) => b === document.activeElement),
    );
    await page.reload();
    await page.getByText('R$ 2.415,00', { exact: true }).first().waitFor();
    await page.getByRole('button', { name: 'Registrar entrada', exact: true }).click();
    await dialog.waitFor();
    assert.ok(await page.getByRole('radio', { name: 'Receita recebida', exact: true }).isChecked());
    assert.ok(
      await dialog
        .getByLabel('Categoria', { exact: true })
        .locator('option')
        .allTextContents()
        .then((values) => values.includes('Outras entradas') && !values.includes('Alimentação')),
    );
    await dialog.getByRole('button', { name: 'Fechar registro rápido' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.goto('http://127.0.0.1:4179/tests/ui/redesign.html?view=conversar');
    await page.getByText('A IA está temporariamente indisponível.', { exact: false }).waitFor();
    assert.ok(await page.getByLabel('Sua mensagem').isDisabled());
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({
      path: `test-results/redesign/conversa-${size.width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Registrar gasto sem IA', exact: true }).click();
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Fechar registro rápido' }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.goto('http://127.0.0.1:4179/tests/ui/redesign.html?view=lancamentos');
    await page.getByLabel('Tipo', { exact: true }).selectOption('expense');
    await page.getByLabel('Conta', { exact: true }).selectOption({ label: 'Carteira de teste' });
    const filters = await page
      .locator('form.filters')
      .evaluate((form) => Object.fromEntries(new FormData(form)));
    assert.equal(filters.kind, 'expense');
    assert.equal(filters.account, '60000000-0000-4000-8000-000000000002');
    await page.goto('http://127.0.0.1:4179/tests/ui/redesign.html?view=configuracao');
    await page.getByLabel('Como podemos chamar você?').fill('Pessoa fictícia');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await page.getByLabel('Nome da conta').fill('Conta fictícia');
    await page.getByRole('button', { name: 'Voltar ao nome', exact: false }).click();
    assert.equal(
      await page.getByLabel('Como podemos chamar você?').inputValue(),
      'Pessoa fictícia',
    );
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.equal(await page.getByLabel('Nome da conta').inputValue(), 'Conta fictícia');
    for (const scenario of ['empty', 'negative', 'long']) {
      await page.goto(
        `http://127.0.0.1:4179/tests/ui/redesign.html?view=painel&scenario=${scenario}`,
      );
      await page.locator('.projection-hero').waitFor();
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Overflow em ${scenario}/${size.width}`,
      );
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const animation = await page
      .locator('.projection-hero')
      .evaluate((e) => getComputedStyle(e).animationName);
    assert.equal(animation, 'none');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(
    'PASSOU: UI isolada em 360/390/1440px; painel, registro rápido e conversa indisponível; ocultar valores; Escape/descartar; foco; dados preservados no erro; UUID estável/clique duplo; atualização/reload simulados; vazio/negativo/nomes longos; reduced motion. Sem Auth/Supabase/OpenAI reais.',
  );
} finally {
  await browser?.close();
  await server.close();
}
