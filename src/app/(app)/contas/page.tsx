import Link from 'next/link';
import { getData } from '@/lib/data';
import { money } from '@/lib/finance/money';
import { dateBR } from '@/lib/finance/dates';
import { accountBalance } from '@/lib/finance/calculations';
import { PageHeader } from '@/components/shell';
import { ActionForm, HiddenId } from '@/components/action-form';
export default async function Accounts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  return (
    <>
      <PageHeader
        title="Suas contas"
        description="Saldos informados por você, sem sincronização bancária."
        action={
          <Link href="/contas/novo" className="btn secondary">
            + Nova conta
          </Link>
        }
      />
      {q.success && (
        <p role="status" className="notice success">
          Conta atualizada. Os totais já refletem a mudança.
        </p>
      )}
      <div className="account-grid">
        {data.accounts.map((a) => (
          <section className="panel account-card" key={a.id}>
            <h2>{a.name}</h2>
            <span className="badge">{a.archived ? 'Arquivada' : 'Conta manual ativa'}</span>
            <p className="large-value section-space">
              {money(accountBalance(a, data.transactions))}
            </p>
            <p className="account-meta">
              Inicial: {money(a.initial_balance_cents)} em {dateBR(a.reference_date)}.
            </p>
            <div className="row-actions">
              <Link href={`/contas/${a.id}/editar`} className="btn secondary">
                Editar
              </Link>
              <ActionForm
                operation={a.archived ? 'account-restore' : 'account-archive'}
                label={a.archived ? 'Reativar' : 'Arquivar'}
                className="inline-form"
                confirm={
                  a.archived
                    ? undefined
                    : 'Arquivar esta conta? Seu saldo continuará no consolidado e o histórico será preservado.'
                }
              >
                <HiddenId id={a.id} />
              </ActionForm>
            </div>
          </section>
        ))}
      </div>
      <p className="field-help section-space">
        Arquivar mantém o saldo e o histórico. Contas não são excluídas nesta versão.
      </p>
      <section className="panel form-card section-space">
        <h2>Seu nome no Tato</h2>
        <ActionForm operation="profile" label="Atualizar nome">
          <label>
            Nome de exibição
            <input
              name="display_name"
              required
              maxLength={120}
              defaultValue={data.profile!.display_name}
            />
          </label>
        </ActionForm>
      </section>
      <p className="form-footer">
        <Link href="/categorias" className="text-link">
          Gerenciar categorias
        </Link>
      </p>
      <section className="panel form-card section-space">
        <h2>Sua sessão</h2>
        <ActionForm auth operation="logout" label="Sair da conta" />
      </section>
    </>
  );
}
