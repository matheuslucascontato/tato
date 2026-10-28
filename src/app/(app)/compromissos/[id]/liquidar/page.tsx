import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { money } from '@/lib/finance/money';
import { todaySP, dateBR } from '@/lib/finance/dates';
import { PageHeader } from '@/components/shell';
import { ActionForm, HiddenId } from '@/components/action-form';
export default async function Settle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const c = data.commitments.find((c) => c.id === id);
  if (!c) notFound();
  const accounts = data.accounts.filter((a) => !a.archived);
  return (
    <>
      <Link href="/compromissos" className="back-link">
        ← Voltar
      </Link>
      <PageHeader
        title={c.kind === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
        description={`${c.description} · ${money(c.amount_cents)} · vencimento ${dateBR(c.due_on)}`}
      />
      <section className="panel form-card">
        {c.status !== 'pending' ? (
          <p className="notice">
            {c.status === 'settled'
              ? 'Este compromisso já foi liquidado. Nenhum lançamento adicional será criado.'
              : 'Este compromisso foi cancelado.'}
          </p>
        ) : !accounts.length ? (
          <>
            <p className="notice warning">
              Você precisa de uma conta ativa para registrar a movimentação.
            </p>
            <Link href="/contas" className="btn primary">
              Gerenciar contas
            </Link>
          </>
        ) : (
          <ActionForm
            operation="settle"
            label={c.kind === 'income' ? 'Confirmar recebimento' : 'Confirmar pagamento'}
          >
            <HiddenId id={c.id} />
            <label>
              Conta real
              <select
                name="account_id"
                required
                defaultValue={accounts.some((a) => a.id === c.account_id) ? c.account_id || '' : ''}
              >
                <option value="">Escolha uma conta</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · referência {dateBR(a.reference_date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data real
              <input
                name="occurred_on"
                type="date"
                required
                min="1900-01-01"
                max={todaySP()}
                defaultValue={todaySP()}
              />
            </label>
            <p className="field-help">
              O Tato criará um único lançamento e atualizará o saldo. A data precisa ser igual ou
              posterior à referência da conta escolhida.
            </p>
          </ActionForm>
        )}
      </section>
    </>
  );
}
