import { test, expect } from '@playwright/test';
for (const size of [
  { name: 'celular', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`acesso, cadastro, recuperação e proteção de rotas em ${size.name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/entrar');
    await expect(page.getByRole('heading', { name: 'Bom ter você por aqui.' })).toBeVisible();
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `test-results/entrar-${size.name}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Criar minha conta' }).click();
    await expect(page.getByRole('heading', { name: 'Vamos começar?' })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('minlength', '8');
    await page.goto('/recuperar-senha');
    await expect(page.getByRole('button', { name: 'Solicitar link' })).toBeVisible();
    for (const route of [
      '/painel',
      '/conversar',
      '/mais',
      '/contas',
      '/lancamentos',
      '/compromissos',
      '/configuracao',
      '/redefinir-senha',
    ]) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/entrar\?expired=1/);
    }
  });
}
test('valida e-mail no navegador e mantém foco por teclado', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('invalido');
  await page.getByLabel('Senha', { exact: true }).fill('senha-invalida');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect(
    await page
      .getByLabel('E-mail', { exact: true })
      .evaluate((e: HTMLInputElement) => e.validity.typeMismatch),
  ).toBe(true);
  await expect(page.getByLabel('E-mail', { exact: true })).toBeFocused();
});
test('rejeita credenciais inválidas sem simular sessão', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill('tato-invalid-credentials@example.invalid');
  await page.getByLabel('Senha', { exact: true }).fill('senha-invalida-apenas-para-teste');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.locator('p[role=alert]')).toContainText('E-mail ou senha não conferem.', {
    timeout: 20000,
  });
  await expect(page).toHaveURL(/\/entrar/);
});
