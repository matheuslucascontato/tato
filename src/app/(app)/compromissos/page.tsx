import Link from 'next/link';
import { Mascot } from '@/components/brand/tato';
import { getData } from '@/lib/data';
import { todaySP, dateBR } from '@/lib/finance/dates';
import { money } from '@/lib/finance/money';
import { PageHeader, Empty } from '@/components/shell';
import { ActionForm, HiddenId } from '@/components/action-form';
export default async function Commitments({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  const today = todaySP();
  const status = q.status || 'pending';
  const rows = data.commitments
    .filter(
      (c) =>
        status === 'all' ||
        (status === 'overdue' ? c.status === 'pending' && c.due_on < today : c.status === status),
    )
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  return (
    <>
      <PageHeader
        title="Compromissos"
        description="Para se preparar para o que vem pela frente."
        action={
          <Link className="btn secondary" href="/compromissos/novo">
            + Novo compromisso
          </Link>
        }
      />
      {q.success && (
        <p role="status" className="notice success">
          Pronto. Compromissos, lançamentos e previsão atualizados.
        </p>
      )}
      {['pending', 'overdue', 'all'].includes(status) &&
        data.commitments.some((c) => c.status === 'pending' && c.due_on <= today) && (
          <aside className="commitment-guidance">
            <Mascot expression="cuidadoso" size={74} />
            <div>
              <h2>Um cuidado com o que vence agora</h2>
              <p>
                Há compromissos pendentes com vencimento até hoje. Confira a lista e registre o
                pagamento ou recebimento quando acontecer.
              </p>
            </div>
          </aside>
        )}
      <form className="filters">
        <label>
          Mostrar
          <select aria-label="Mostrar" name="status" defaultValue={status}>
            <option value="pending">Pendentes</option>
            <option value="overdue">Vencidos e pendentes</option>
            <option value="settled">Pagos e recebidos</option>
            <option value="cancelled">Cancelados</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <button className="btn secondary">Filtrar</button>
      </form>
      <section className="panel transaction-list">
        {rows.length ? (
          rows.map((c) => (
            <article className="list-item" key={c.id}>
              <div>
                <h3>{c.description}</h3>
                <p>
                  Vencimento: {dateBR(c.due_on)} ·{' '}
                  {data.categories.find((cat) => cat.id === c.category_id)?.name}
                </p>
                <p>
                  Conta prevista:{' '}
                  {data.accounts.find((a) => a.id === c.account_id)?.name || 'A decidir'}
                </p>
                <span
                  className={`badge ${c.status === 'pending' && c.due_on < today ? 'overdue' : c.status === 'cancelled' ? 'cancelled' : ''}`}
                >
                  {c.status === 'settled'
                    ? c.kind === 'income'
                      ? 'Recebido'
                      : 'Pago'
                    : c.status === 'cancelled'
                      ? 'Cancelado'
                      : c.due_on < today
                        ? 'Vencido · pendente'
                        : 'Pendente'}
                </span>
                <span className="badge">
                  {c.kind === 'income' ? 'Entrada prevista' : 'Conta a pagar'}
                </span>
                {c.status === 'pending' ? (
                  <div className="row-actions">
                    <Link href={`/compromissos/${c.id}/liquidar`} className="btn primary">
                      {c.kind === 'income' ? 'Marcar recebido' : 'Marcar pago'}
                    </Link>
                    <Link href={`/compromissos/${c.id}/editar`} className="btn secondary">
                      Editar
                    </Link>
                    <ActionForm
                      operation="commitment-cancel"
                      label="Cancelar"
                      destructive
                      confirm={`Cancelar “${c.description}”? Ele sairá da previsão e continuará no histórico.`}
                      className="inline-form"
                    >
                      <HiddenId id={c.id} />
                    </ActionForm>
                  </div>
                ) : c.status === 'settled' ? (
                  <div className="row-actions">
                    <Link className="text-link" href={`/compromissos/${c.id}/estornar`}>
                      Estornar e reabrir compromisso
                    </Link>
                    <p>
                      {(() => {
                        const t = data.transactions.find((t) => t.commitment_id === c.id);
                        return t
                          ? `Realizado em ${dateBR(t.occurred_on)} · ${data.accounts.find((a) => a.id === t.account_id)?.name}`
                          : '';
                      })()}
                    </p>
                  </div>
                ) : null}
              </div>
              <strong className="value">
                {c.kind === 'income' ? '+' : '−'} {money(c.amount_cents)}
              </strong>
            </article>
          ))
        ) : (
          <Empty
            title="Tudo tranquilo por aqui"
            href="/compromissos/novo"
            label="Adicionar compromisso"
          >
            Nenhum compromisso neste filtro. Cadastre uma conta a pagar ou uma entrada prevista.
          </Empty>
        )}
      </section>
    </>
  );
}
