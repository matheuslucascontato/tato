import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Wallet,
  CalendarDays,
  Info,
  Check,
  Layers,
} from 'lucide-react';
import type { Snapshot } from '@/lib/types';
import { dashboard, accountBalance } from '@/lib/finance/calculations';
import { dateBR, monthBR, monthEnd } from '@/lib/finance/dates';
import { money } from '@/lib/finance/money';
import { Mascot } from './brand/tato';
import { MoneyValue, PrivacyToggle } from './ui/app-ui';
import { QuickEntryButton } from './quick-entry';
import { Empty } from './shell';
export function DashboardView({
  data,
  today,
  month,
}: {
  data: Snapshot;
  today: string;
  month: string;
}) {
  const d = dashboard(data.accounts, data.transactions, data.commitments, month, today);
  const pending = data.commitments
    .filter((c) => c.status === 'pending')
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const archived = data.accounts.filter(
    (a) => a.archived && accountBalance(a, data.transactions) !== 0n,
  );
  const combined = d.income + d.expense;
  const incomeShare = combined ? Number((d.income * 100n) / combined) : 50;
  const firstName = data.profile?.display_name.trim().split(/\s+/)[0] || 'você';
  return (
    <div className="dashboard">
      <header className="dashboard-greeting">
        <div>
          <p className="eyebrow">HOJE, COM MAIS CLAREZA · {dateBR(today)}</p>
          <h1>
            Olá, {firstName}
            <span className="greeting-period">.</span>
          </h1>
          <p>Vamos olhar o que vem pela frente?</p>
        </div>
        <div className="greeting-actions">
          <PrivacyToggle />
          <Mascot size={112} />
        </div>
      </header>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="projection-hero" aria-labelledby="projection-title">
            <div className="shell-bands" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <div className="hero-topline">
              <span className="pill-light">
                <span /> SEU AMANHÃ NO RADAR
              </span>
              <Layers size={24} aria-hidden="true" />
            </div>
            <h2 id="projection-title">
              Sua folga estimada
              <br />
              até {dateBR(d.end)}
            </h2>
            <p className="hero-amount">
              <MoneyValue>{money(d.projected)}</MoneyValue>
            </p>
            <p className="hero-support">
              <Check size={15} aria-hidden="true" /> Com base no que você cadastrou
            </p>
            <a href="#como-calculamos" className="hero-explanation">
              Entenda essa estimativa{' '}
              <span>
                <ArrowDownLeft size={20} />
              </span>
            </a>
          </section>
          {d.projected < 0n && (
            <div className="guidance notice warning">
              <Mascot expression="cuidadoso" size={65} />
              <p>
                As saídas cadastradas superam o saldo e as entradas previstas até {dateBR(d.end)}.
                Você pode revisar os compromissos e planejar os próximos passos.
              </p>
            </div>
          )}
          <div className="registered-strip">
            <Wallet size={23} aria-hidden="true" />
            <div>
              <p>Saldo registrado atual</p>
              <strong>
                <MoneyValue>{money(d.balance)}</MoneyValue>
              </strong>
              <span>O que já aconteceu nas suas contas</span>
            </div>
            <Link href="/contas" aria-label="Ver saldos das contas" className="icon-button">
              <ArrowUpRight size={21} />
            </Link>
          </div>
          {archived.length > 0 && (
            <p className="notice warning">
              O consolidado inclui {archived.length} conta(s) arquivada(s) com saldo:{' '}
              {archived.map((a) => a.name).join(', ')}. Arquivar preserva o histórico e o saldo.
            </p>
          )}
          <div className="quick-actions">
            <QuickEntryButton kind="expense" className="quick-action expense">
              <span>Registrar gasto</span>
            </QuickEntryButton>
            <QuickEntryButton kind="income" className="quick-action income">
              <span>Registrar entrada</span>
            </QuickEntryButton>
          </div>
          <section className="period-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">O QUE JÁ ACONTECEU</p>
                <h2>Seu mês em movimento</h2>
              </div>
            </div>
            <form className="period-filter">
              <label className="sr-only" htmlFor="report-month">
                Resumo de receitas e despesas
              </label>
              <input
                id="report-month"
                type="month"
                name="month"
                defaultValue={month}
                min="1900-01"
              />
              <button className="btn ghost" type="submit">
                Ver mês <ArrowRight size={16} />
              </button>
            </form>
            <p className="date-note">Realizado em {monthBR(month)}</p>
            <div className="month-metrics">
              <div>
                <span className="metric-icon">
                  <ArrowDownLeft size={19} />
                </span>
                <p>Receitas recebidas no mês</p>
                <strong>
                  <MoneyValue>{money(d.income)}</MoneyValue>
                </strong>
              </div>
              <div>
                <span className="metric-icon expense">
                  <ArrowUpRight size={19} />
                </span>
                <p>Despesas realizadas no mês</p>
                <strong>
                  <MoneyValue>{money(d.expense)}</MoneyValue>
                </strong>
              </div>
            </div>
            <div className="period-visual" aria-hidden="true">
              <span style={{ width: `${incomeShare}%` }} />
              <span style={{ width: `${100 - incomeShare}%` }} />
            </div>
            <Link
              href={`/lancamentos?from=${month}-01&to=${monthEnd(month)}`}
              className="text-link"
            >
              Ver lançamentos deste período <ArrowUpRight size={15} />
            </Link>
          </section>
          <details id="como-calculamos" className="forecast-details">
            <summary>
              <Info size={18} /> Como chegamos à previsão
            </summary>
            <div className="calculation-body">
              <Mascot expression="explicando" size={88} />
              <div>
                <p>
                  Saldo registrado de <MoneyValue>{money(d.balance)}</MoneyValue> + entradas
                  pendentes de <MoneyValue>{money(d.incoming)}</MoneyValue> − saídas pendentes de{' '}
                  <MoneyValue>{money(d.outgoing)}</MoneyValue> ={' '}
                  <strong>
                    <MoneyValue>{money(d.projected)}</MoneyValue>
                  </strong>{' '}
                  até {dateBR(d.end)}.
                </p>
                <p className="field-help">
                  Inclui pendências vencidas e as que vencem até essa data. Cancelados e já
                  liquidados ficam fora. É uma estimativa do que foi cadastrado, sem sincronização
                  bancária nem garantia de dinheiro disponível. O filtro do mês altera apenas o
                  relatório; saldo e previsão continuam acumulados.
                </p>
              </div>
            </div>
          </details>
        </div>
        <aside className="dashboard-aside">
          <section className="upcoming-section">
            <div className="section-heading">
              <h2>
                <CalendarDays size={20} /> Próximos compromissos
              </h2>
              <Link href="/compromissos" className="text-link">
                Ver todos <ArrowUpRight size={14} />
              </Link>
            </div>
            {d.overdue.length > 0 && (
              <Link className="overdue-note" href="/compromissos?status=overdue">
                <span />
                {d.overdue.length} vencido(s), ainda pendente(s) <ArrowRight size={15} />
              </Link>
            )}
            {pending.length ? (
              <div className="upcoming-list">
                {pending.slice(0, 5).map((c) => (
                  <Link
                    href={`/compromissos/${c.id}/liquidar`}
                    className="upcoming-item"
                    key={c.id}
                  >
                    <span className={`due-symbol ${c.kind === 'income' ? 'incoming' : ''}`}>
                      {c.kind === 'income' ? (
                        <ArrowDownLeft size={18} />
                      ) : (
                        <CalendarDays size={18} />
                      )}
                    </span>
                    <div>
                      <h3>{c.description}</h3>
                      <p>
                        {dateBR(c.due_on)} ·{' '}
                        {c.kind === 'income' ? 'Entrada prevista' : 'Conta a pagar'}
                      </p>
                      <p>
                        {data.categories.find((x) => x.id === c.category_id)?.name}
                        {c.account_id
                          ? ` · ${data.accounts.find((a) => a.id === c.account_id)?.name || ''}`
                          : ''}
                      </p>
                      {c.due_on < today && (
                        <span className="badge overdue">Vencido · pendente</span>
                      )}
                    </div>
                    <strong>
                      <MoneyValue>
                        {c.kind === 'income' ? '+' : '−'} {money(c.amount_cents)}
                      </MoneyValue>
                    </strong>
                  </Link>
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
            <Link className="btn secondary full-width" href="/compromissos/novo">
              + Adicionar compromisso
            </Link>
          </section>
          <section className="accounts-overview">
            <div className="section-heading">
              <h2>Suas contas</h2>
              <Link href="/contas" className="text-link">
                Gerenciar
              </Link>
            </div>
            {data.accounts.map((a) => (
              <div key={a.id} className="account-overview-row">
                <span className="account-monogram" aria-hidden="true">
                  {a.name.trim().slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <h3>{a.name}</h3>
                  <p>{a.archived ? 'Arquivada · incluída no total' : 'Conta manual'}</p>
                </div>
                <strong>
                  <MoneyValue>{money(accountBalance(a, data.transactions))}</MoneyValue>
                </strong>
              </div>
            ))}
          </section>
          <Link href="/conversar" className="tato-invitation">
            <div>
              <p className="eyebrow">UM POUCO DE AJUDA</p>
              <h2>
                Vamos entender
                <br />
                seu dinheiro juntos?
              </h2>
              <span>
                Conversar com o Tato <ArrowUpRight size={18} />
              </span>
            </div>
            <span className="invitation-mark" aria-hidden="true">
              <ArrowUpRight size={76} strokeWidth={1} />
            </span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
