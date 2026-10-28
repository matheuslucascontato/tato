import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Wallet, Leaf, CalendarDays } from 'lucide-react';
import { getData } from '@/lib/data';
import { dashboard, accountBalance } from '@/lib/finance/calculations';
import { todaySP, dateBR, monthBR } from '@/lib/finance/dates';
import { money } from '@/lib/finance/money';
import { PageHeader, Empty } from '@/components/shell';
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  const today = todaySP();
  const month =
    q.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month) && q.month >= '1900-01'
      ? q.month
      : today.slice(0, 7);
  const d = dashboard(data.accounts, data.transactions, data.commitments, month, today);
  const pending = data.commitments
    .filter((c) => c.status === 'pending')
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const archived = data.accounts.filter(
    (a) => a.archived && accountBalance(a, data.transactions) !== 0n,
  );
  return (
    <>
      <PageHeader
        eyebrow="UM CUIDADO DE CADA VEZ"
        title={`Olá, ${data.profile!.display_name.split(' ')[0]}.`}
        description="Vamos olhar para o seu dinheiro com calma."
      />
      {q.success && (
        <p role="status" className="notice success">
          Tudo certo. Suas informações foram salvas.
        </p>
      )}
      <div className="summary-grid">
        <section className="panel balance-card">
          <p className="card-label">
            <Wallet size={18} />
            Saldo registrado atual
          </p>
          <p className="large-value">{money(d.balance)}</p>
          <p className="field-help">
            Suas contas manuais somadas, com os lançamentos realizados até {dateBR(today)}.
          </p>
        </section>
        <section className="panel projection-card">
          <p className="card-label">
            <Leaf size={18} />
            Folga prevista até {dateBR(d.end)}
          </p>
          <p className={`large-value ${d.projected < 0n ? 'amount-negative' : ''}`}>
            {money(d.projected)}
          </p>
          <p className="field-help">
            Inclui entradas previstas e contas a pagar cadastradas, inclusive as vencidas.
          </p>
        </section>
      </div>
      {archived.length > 0 && (
        <p className="notice warning">
          O consolidado inclui {archived.length} conta(s) arquivada(s) com saldo:{' '}
          {archived.map((a) => a.name).join(', ')}. Arquivar mantém o histórico e o dinheiro no
          cálculo.
        </p>
      )}
      {d.overdue.length > 0 && (
        <p className="notice warning">
          <strong>{d.overdue.length} compromisso(s) com vencimento passado.</strong> Continuam
          pendentes na previsão.{' '}
          <Link className="text-link" href="/compromissos?status=overdue">
            Conferir pendências
          </Link>
        </p>
      )}
      <form className="filters">
        <label>
          Resumo de receitas e despesas
          <input type="month" name="month" defaultValue={month} min="1900-01" />
        </label>
        <button className="btn secondary" type="submit">
          Ver mês
        </button>
        <span className="date-note">Realizado em {monthBR(month)}</span>
      </form>
      <div className="metrics-grid">
        <section className="panel metric">
          <span className="metric-icon">
            <ArrowDownLeft size={21} />
          </span>
          <div>
            <p>Receitas recebidas no mês</p>
            <strong>{money(d.income)}</strong>
          </div>
        </section>
        <section className="panel metric">
          <span className="metric-icon expense">
            <ArrowUpRight size={21} />
          </span>
          <div>
            <p>Despesas realizadas no mês</p>
            <strong>{money(d.expense)}</strong>
          </div>
        </section>
      </div>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>O que vem pela frente</h2>
            <Link href="/compromissos" className="text-link">
              Ver todos
            </Link>
          </div>
          {pending.length ? (
            <div className="list">
              {pending.slice(0, 5).map((c) => (
                <div key={c.id} className="list-item">
                  <div>
                    <h3>{c.description}</h3>
                    <p>
                      {dateBR(c.due_on)} ·{' '}
                      {c.kind === 'income' ? 'Entrada prevista' : 'Conta a pagar'}
                    </p>
                    {c.due_on < today && <span className="badge overdue">Vencido · pendente</span>}
                  </div>
                  <div className="value">
                    {c.kind === 'income' ? '+' : '−'} {money(c.amount_cents)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Um espaço para se antecipar"
              href="/compromissos/novo"
              label="Adicionar compromisso"
            >
              Cadastre o que você espera receber e pagar. Tudo começa pelo que você já sabe.
            </Empty>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Suas contas</h2>
            <Link href="/contas" className="text-link">
              Gerenciar
            </Link>
          </div>
          <div className="list">
            {data.accounts.map((a) => (
              <div key={a.id} className="list-item">
                <div>
                  <h3>{a.name}</h3>
                  <p>{a.archived ? 'Arquivada · incluída no total' : 'Conta manual'}</p>
                </div>
                <span className="value">{money(accountBalance(a, data.transactions))}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel section-space">
        <div className="panel-heading">
          <h2>
            <CalendarDays
              size={18}
              style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }}
            />
            Como chegamos à previsão
          </h2>
        </div>
        <p className="field-help">
          Saldo registrado de {money(d.balance)} + entradas pendentes de {money(d.incoming)} −
          saídas pendentes de {money(d.outgoing)} = {money(d.projected)} até {dateBR(d.end)}.
          Incluímos todas as pendências vencidas e as que vencem até essa data; compromissos
          cancelados ou já liquidados ficam fora da previsão.
        </p>
        <p className="field-help section-space">
          É uma estimativa baseada no que você cadastrou, sem sincronização bancária ou garantia de
          dinheiro disponível. O filtro do mês altera apenas o resumo de receitas e despesas; o
          saldo atual e a previsão continuam acumulados.
        </p>
      </section>
    </>
  );
}
