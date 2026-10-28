import { redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { todaySP } from '@/lib/finance/dates';
import { ActionForm } from '@/components/action-form';
import { AccountFields } from '@/components/fields';
export const dynamic = 'force-dynamic';
export default async function Setup() {
  const data = await getData();
  if (data.profile && data.accounts.length && data.categories.length) redirect('/painel');
  return (
    <main className="error-page" style={{ maxWidth: 650 }}>
      <p className="brand">
        tato<span className="brand-dot">.</span>
      </p>
      <p className="eyebrow">PARA COMEÇAR COM CLAREZA</p>
      <h1>Vamos conhecer seu ponto de partida</h1>
      <p className="muted">
        Cadastre sua primeira conta manual. Os valores são informados por você, sem conexão com o
        banco.
      </p>
      <section className="panel">
        <ActionForm operation="onboard" label="Começar a organizar">
          <label>
            Como podemos chamar você?
            <input
              name="display_name"
              required
              maxLength={120}
              autoComplete="given-name"
              defaultValue={data.profile?.display_name}
            />
          </label>
          <AccountFields today={todaySP()} account={data.accounts[0]} locked={!!data.accounts[0]} />
          <p className="field-help">
            As categorias iniciais serão preparadas para você. Se precisar sair, poderá retomar esta
            configuração.
          </p>
        </ActionForm>
      </section>
      <div className="section-space">
        <ActionForm auth operation="logout" label="Sair" className="logout-form" />
      </div>
    </main>
  );
}
