import { test, expect } from '@playwright/test';
import { todaySP } from '../../src/lib/finance/dates';
// A NEW, confirmed user in a dedicated test project is required. Never a real account.
test('cadastro financeiro, liquidação e persistência após recarregar', async ({ page }) => {
  test.skip(
    !process.env.TATO_E2E_EMAIL ||
      !process.env.TATO_E2E_PASSWORD ||
      process.env.TATO_E2E_ISOLATED !== 'yes',
    'Requer um usuário confirmado, vazio, exclusivo de testes e TATO_E2E_ISOLATED=yes.',
  );
  const today = todaySP();
  const suffix = Date.now().toString();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(process.env.TATO_E2E_EMAIL!);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.TATO_E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/configuracao/);
  await page.getByLabel('Como podemos chamar você?').fill('Pessoa de teste');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await page.getByLabel('Nome da conta').fill(`TESTE principal ${suffix}`);
  await page.getByLabel('Saldo inicial (R$)', { exact: true }).fill('500,00');
  await page.getByRole('button', { name: 'Concluir configuração' }).click();
  await expect(page).toHaveURL(/\/painel/);
  await page.goto('/contas/novo');
  await page.getByLabel('Nome da conta').fill(`TESTE segunda ${suffix}`);
  await page.getByRole('button', { name: 'Adicionar conta', exact: true }).click();
  await expect(page).toHaveURL(/\/contas/);
  for (const entry of [
    { kind: 'income', description: 'TESTE receita', value: '2.000,00' },
    { kind: 'expense', description: 'TESTE despesa', value: '150,00' },
  ]) {
    await page.goto('/lancamentos/novo');
    await page
      .getByRole('radio', {
        name: entry.kind === 'income' ? 'Receita recebida' : 'Despesa realizada',
        exact: true,
      })
      .check();
    await page.getByLabel('Descrição', { exact: true }).fill(entry.description);
    await page.getByLabel('Valor (R$)', { exact: true }).fill(entry.value);
    await page
      .getByLabel('Conta', { exact: true })
      .selectOption({ label: `TESTE principal ${suffix}` });
    await page.getByLabel('Categoria', { exact: true }).selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Adicionar lançamento', exact: true }).click();
    await expect(page).toHaveURL(/\/lancamentos/);
  }
  await page.goto('/painel');
  await expect(page.getByText('R$ 2.350,00', { exact: true }).first()).toBeVisible();
  for (const entry of [
    { kind: 'expense', description: `TESTE pagar ${suffix}`, value: '300,00' },
    { kind: 'income', description: `TESTE receber ${suffix}`, value: '400,00' },
  ]) {
    await page.goto('/compromissos/novo');
    await page
      .getByRole('radio', {
        name: entry.kind === 'income' ? 'Entrada prevista' : 'Conta a pagar',
        exact: true,
      })
      .check();
    await page.getByLabel('Descrição', { exact: true }).fill(entry.description);
    await page.getByLabel('Valor (R$)', { exact: true }).fill(entry.value);
    await page.getByLabel('Vencimento', { exact: true }).fill(today);
    await page.getByLabel('Categoria', { exact: true }).selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Adicionar compromisso', exact: true }).click();
    await expect(page).toHaveURL(/\/compromissos/);
  }
  await page.goto('/painel');
  await expect(page.getByText('R$ 2.450,00', { exact: true }).first()).toBeVisible();
  await page.goto('/compromissos');
  await page
    .getByRole('article')
    .filter({ hasText: `TESTE pagar ${suffix}` })
    .getByRole('link', { name: 'Marcar pago' })
    .click();
  await page.getByLabel('Conta real').selectOption({
    label: `TESTE principal ${suffix} · referência ${today.split('-').reverse().join('/')}`,
  });
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click();
  await expect(page).toHaveURL(/\/compromissos/);
  await page.goto('/painel');
  await page.reload();
  await expect(page.getByText('R$ 2.050,00', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('R$ 2.450,00', { exact: true }).first()).toBeVisible();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/painel-${viewport.width}.png`, fullPage: true });
  }
});
