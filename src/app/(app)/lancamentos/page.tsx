import Link from 'next/link';
import { getData } from '@/lib/data';
import { todaySP, monthEnd, dateBR, validDate } from '@/lib/finance/dates';
import { money } from '@/lib/finance/money';
import { PageHeader, Empty } from '@/components/shell';
import { ActionForm, HiddenId } from '@/components/action-form';
export default async function Transactions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  const today = todaySP();
  const from = q.from && validDate(q.from) ? q.from : `${today.slice(0, 7)}-01`;
  const to = q.to && validDate(q.to) ? q.to : monthEnd(today.slice(0, 7));
  const rows = data.transactions
    .filter(
      (t) =>
        t.occurred_on >= from &&
        t.occurred_on <= to &&
        (!q.kind || t.kind === q.kind) &&
        (!q.account || t.account_id === q.account),
    )
    .sort(
      (a, b) =>
        b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <PageHeader
        title="Lançamentos"
        description="O que você já recebeu e pagou, em um só lugar."
        action={
          <Link className="btn secondary" href="/lancamentos/novo">
            + Novo lançamento
          </Link>
        }
      />
      {q.success && (
        <p className="notice success" role="status">
          Pronto. Lançamentos e saldos atualizados.
        </p>
      )}
      <form className="filters">
        <label>
          De
          <input type="date" name="from" defaultValue={from} min="1900-01-01" />
        </label>
        <label>
          Até
          <input type="date" name="to" defaultValue={to} min="1900-01-01" />
        </label>
        <label>
          Tipo
          <select name="kind" defaultValue={q.kind || ''}>
            <option value="">Todos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
          </select>
        </label>
        <label>
          Conta
          <select name="account" defaultValue={q.account || ''}>
            <option value="">Todas as contas</option>
            {data.accounts.map((a) => (
              <option value={a.id} key={a.id}>
                {a.name}
                {a.archived ? ' (arquivada)' : ''}
              </option>
            ))}
          </select>
        </label>
        <button className="btn secondary" type="submit">
          Filtrar
        </button>
        <Link className="text-link" href="/lancamentos">
          Limpar
        </Link>
      </form>
      {from > to && (
        <p role="alert" className="notice error">
          A data inicial precisa ser anterior ou igual à final.
        </p>
      )}
      <section className="panel transaction-list">
        {rows.length ? (
          rows.map((t) => (
            <article
              key={t.id}
              id={`lancamento-${t.id}`}
              className={`list-item ${q.destaque === t.id ? 'transaction-highlight' : ''}`}
            >
              <div>
                <h3>{t.description}</h3>
                <p>
                  {dateBR(t.occurred_on)} · {data.accounts.find((a) => a.id === t.account_id)?.name}{' '}
                  · {data.categories.find((c) => c.id === t.category_id)?.name}
                </p>
                <span className="badge">
                  {t.kind === 'income' ? 'Receita recebida' : 'Despesa realizada'}
                </span>
                {t.commitment_id ? (
                  <>
                    <span className="badge">Vinculado a compromisso</span>
                    <div className="row-actions">
                      <Link
                        href={`/compromissos/${t.commitment_id}/estornar`}
                        className="text-link"
                      >
                        Estornar e reabrir compromisso
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="row-actions">
                    <Link className="btn secondary" href={`/lancamentos/${t.id}/editar`}>
                      Editar
                    </Link>
                    <ActionForm
                      operation="transaction-delete"
                      label="Excluir"
                      destructive
                      confirm={`Excluir “${t.description}”? O saldo será recalculado. Esta ação não pode ser desfeita.`}
                      className="inline-form"
                    >
                      <HiddenId id={t.id} />
                    </ActionForm>
                  </div>
                )}
              </div>
              <strong className={`value ${t.kind === 'income' ? 'income-text' : 'expense-text'}`}>
                {t.kind === 'income' ? '+' : '−'} {money(t.amount_cents)}
              </strong>
            </article>
          ))
        ) : (
          <Empty
            title="Nenhum lançamento neste período"
            href="/lancamentos/novo"
            label="Adicionar lançamento"
          >
            Você pode mudar os filtros ou registrar uma receita ou despesa já realizada.
          </Empty>
        )}
      </section>
      <p className="field-help section-space">
        Exibindo {rows.length} lançamento(s) de {dateBR(from)} a {dateBR(to)}. Estes filtros não
        alteram o saldo acumulado das contas.
      </p>
    </>
  );
}
