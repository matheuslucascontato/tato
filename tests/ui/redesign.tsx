import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell, PageHeader } from '@/components/shell';
import { DashboardView } from '@/components/dashboard-view';
import { Chat } from '@/components/ai/chat';
import { SetupForm } from '@/components/setup-form';
import { AppUI } from '@/components/ui/app-ui';
import { EntryFields } from '@/components/fields';
import { ActionForm, HiddenId } from '@/components/action-form';
import { usePathname } from './router';
import { fixture, TODAY } from './fixtures';
import { TransactionFilters } from '@/components/filters';
import '@/app/globals.css';
import '@/app/redesign.css';
const subscribe = (fn: () => void) => {
  window.addEventListener('tato-test-refresh', fn);
  return () => window.removeEventListener('tato-test-refresh', fn);
};
function Root() {
  const path = usePathname();
  const records = useSyncExternalStore(
    subscribe,
    () => sessionStorage.getItem('tato-ui-only-records') || '[]',
    () => '[]',
  );
  const data = fixture();
  data.transactions.push(...JSON.parse(records));
  const scenario = new URLSearchParams(location.search).get('scenario');
  if (scenario === 'empty') {
    data.transactions = [];
    data.commitments = [];
    data.accounts[0].initial_balance_cents = 0;
  }
  if (scenario === 'negative') data.accounts[0].initial_balance_cents = -500000;
  if (scenario === 'long') {
    data.profile!.display_name = 'NomeExtremamenteLongoParaTestarQuebraDeLinha';
    data.accounts[0].name =
      'Uma conta manual com nome muito comprido para verificar a leitura e a quebra em telas pequenas';
    data.accounts[0].initial_balance_cents = 99999999999;
  }
  return (
    <AppUI>
      <div className="test-only-banner">
        UI ISOLADA · dados fictícios · Auth, servidor e IA simulados
      </div>
      {path === '/configuracao' ? (
        <main className="setup-shell">
          <SetupForm today={TODAY} />
        </main>
      ) : (
        <Shell
          name="Pessoa de teste"
          accounts={data.accounts}
          categories={data.categories}
          today={TODAY}
        >
          {path === '/painel' ? (
            <DashboardView data={data} today={TODAY} month="2026-10" />
          ) : path === '/lancamentos' ? (
            <>
              <PageHeader title="Lançamentos" />
              <TransactionFilters
                from="2026-10-01"
                to={TODAY}
                kind=""
                account=""
                accounts={data.accounts}
              />
            </>
          ) : path === '/lancamentos/novo' ? (
            <>
              <PageHeader title="Novo lançamento" />
              <section className="panel form-card">
                <ActionForm operation="transaction-create" label="Adicionar lançamento">
                  <HiddenId id="60000000-0000-4000-8000-000000000099" />
                  <EntryFields
                    accounts={data.accounts}
                    categories={data.categories}
                    today={TODAY}
                    featured
                  />
                </ActionForm>
              </section>
            </>
          ) : (
            <>
              <PageHeader
                title="Conversar com o Tato"
                description="Pergunte sobre seus registros ou prepare uma receita ou despesa para revisar."
              />
              <Chat
                unavailable="A IA está temporariamente indisponível. Você pode continuar pelo registro manual."
                accounts={data.accounts}
                categories={data.categories}
              />
            </>
          )}
        </Shell>
      )}
    </AppUI>
  );
}
createRoot(document.getElementById('root')!).render(<Root />);
