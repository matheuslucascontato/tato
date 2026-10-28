'use client';
import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { money, moneyInput, parseMoney } from '@/lib/finance/money';
import { dateBR, todaySP } from '@/lib/finance/dates';
import type { ChatResult, Command, ProposalView } from '@/lib/ai/types';
type Choice = { id: string; name: string };
type CategoryChoice = Choice & { kind: 'income' | 'expense' };
type Row = { id: string; role: 'user' | 'tato'; text: string; result?: ChatResult };
export function Chat({
  accounts,
  categories,
  unavailable,
}: {
  accounts: Choice[];
  categories: CategoryChoice[];
  unavailable?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState('');
  const [context, setContext] = useState<string>();
  const [proposal, setProposal] = useState<ProposalView>();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [uncertain, setUncertain] = useState<string>();
  const textarea = useRef<HTMLTextAreaElement>(null);
  async function execute(command: Command) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/tato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
        signal: AbortSignal.timeout(43_000),
      });
      const result = (await response.json()) as ChatResult & { error?: string; code?: string };
      if (!response.ok) {
        if (response.status === 401) setExpired(true);
        if (['timeout', 'already_consumed'].includes(result.code || '') || response.status >= 500)
          setUncertain(
            command.action === 'message'
              ? command.request_id
              : 'id' in command
                ? command.id
                : undefined,
          );
        throw new Error(result.error || 'Não foi possível concluir.');
      }
      setRows((previous) => [
        ...previous.slice(-19),
        { id: crypto.randomUUID(), role: 'tato', text: result.message, result },
      ]);
      if (result.context) setContext(result.context);
      if (result.proposal) {
        setProposal(result.proposal);
        setEditing(false);
      }
      if (command.action === 'cancel' || result.transaction_id) {
        setProposal(undefined);
        setEditing(false);
        setContext(undefined);
      }
      if (result.transaction_id) router.refresh();
      setUncertain(undefined);
      return result;
    } catch (e) {
      const network =
        e instanceof Error && ['AbortError', 'TimeoutError', 'TypeError'].includes(e.name);
      if (network)
        setUncertain(
          command.action === 'message'
            ? command.request_id
            : 'id' in command
              ? command.id
              : undefined,
        );
      setError(
        network
          ? 'A resposta não chegou. Não repetiremos a chamada à IA. Use “Verificar tentativa” para conferir se existe confirmação no banco.'
          : e instanceof Error
            ? e.message
            : 'Não foi possível concluir.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || busyRef.current || proposal || uncertain) return;
    const request_id = crypto.randomUUID();
    setRows((p) => [...p.slice(-19), { id: request_id, role: 'user', text }]);
    setMessage('');
    await execute({
      action: 'message',
      request_id,
      message: text,
      ...(context ? { context } : {}),
    });
  }
  return (
    <div className="chat-layout">
      <div className="notice">
        A IA recebe sua mensagem, até três mensagens curtas desta conversa e nomes de
        contas/categorias. Não recebe e-mail, senha nem seu histórico financeiro completo. Resumos
        são calculados pelo Tato. Nada é lançado sem revisar e confirmar.
      </div>
      {unavailable && (
        <p role="status" className="notice warning">
          {unavailable}
        </p>
      )}
      <section className="panel chat-thread" aria-label="Conversa com o Tato" aria-busy={busy}>
        {!rows.length && (
          <div className="chat-welcome">
            <h2>Um cuidado de cada vez</h2>
            <p>Você pode começar assim:</p>
            <ul>
              <li>“Gastei R$35 no mercado hoje”</li>
              <li>“Quanto gastei com alimentação este mês?”</li>
              <li>“Quanto sobra depois das contas cadastradas?”</li>
            </ul>
            <p className="field-help">
              Prepare uma movimentação por vez. Para o futuro, use{' '}
              <Link className="text-link" href="/compromissos">
                Compromissos
              </Link>
              .
            </p>
          </div>
        )}
        <div role="log" aria-live="polite" aria-relevant="additions" className="chat-messages">
          {rows.map((row) => (
            <article key={row.id} className={`chat-message ${row.role}`}>
              <strong>{row.role === 'user' ? 'Você' : 'Tato'}</strong>
              <p>{row.text}</p>
              {row.result?.summary && (
                <div className="chat-summary">
                  <h3>{row.result.summary.title}</h3>
                  <p className="field-help">{row.result.summary.period}</p>
                  <dl>
                    {row.result.summary.values.map((v, i) => (
                      <div key={i}>
                        <dt>{v.label}</dt>
                        <dd>{v.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="field-help">{row.result.summary.note}</p>
                </div>
              )}
              {row.result?.href && (
                <Link className="text-link" href={row.result.href}>
                  {row.result.transaction_id ? 'Visualizar lançamento' : 'Abrir tela manual'}
                </Link>
              )}
            </article>
          ))}
        </div>
        {proposal && (
          <section className="chat-proposal" aria-label="Proposta de lançamento">
            <p className="eyebrow">REVISÃO · VERSÃO {proposal.version}</p>
            <h2>Confira antes de lançar</h2>
            <dl className="proposal-details">
              <div>
                <dt>Tipo</dt>
                <dd>
                  {proposal.content.kind === 'income' ? 'Receita recebida' : 'Despesa realizada'}
                </dd>
              </div>
              <div>
                <dt>Valor</dt>
                <dd>{money(proposal.content.amount_cents)}</dd>
              </div>
              <div>
                <dt>Descrição</dt>
                <dd>{proposal.content.description}</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>{dateBR(proposal.content.occurred_on)}</dd>
              </div>
              <div>
                <dt>Conta</dt>
                <dd>{proposal.account_name}</dd>
              </div>
              <div>
                <dt>Categoria sugerida</dt>
                <dd>{proposal.category_name}</dd>
              </div>
            </dl>
            <p className="field-help">
              Validade de 15 minutos a partir da preparação. Correções geram uma nova versão para
              revisão.
            </p>
            {editing ? (
              <Correction
                key={proposal.version}
                proposal={proposal}
                accounts={accounts}
                categories={categories}
                busy={busy}
                onSave={async (content) => {
                  await execute({
                    action: 'revise',
                    id: proposal.id,
                    version: proposal.version,
                    token: proposal.token,
                    content,
                  });
                }}
                onClose={() => setEditing(false)}
              />
            ) : (
              <div className="row-actions">
                <button
                  className="btn primary"
                  disabled={busy || expired}
                  onClick={() =>
                    execute({
                      action: 'confirm',
                      id: proposal.id,
                      version: proposal.version,
                      token: proposal.token,
                    })
                  }
                >
                  Confirmar lançamento
                </button>
                <button
                  className="btn secondary"
                  disabled={busy || expired}
                  onClick={() => setEditing(true)}
                >
                  Corrigir dados
                </button>
                <button
                  className="btn secondary"
                  disabled={busy || expired}
                  onClick={() =>
                    execute({ action: 'cancel', id: proposal.id, version: proposal.version })
                  }
                >
                  Cancelar
                </button>
              </div>
            )}
          </section>
        )}
        {busy && (
          <p role="status" className="notice">
            {proposal ? 'Conferindo a proposta…' : 'O Tato está interpretando sua mensagem…'}
          </p>
        )}
        {error && (
          <div role="alert" className="notice error">
            {error}
            {expired && (
              <>
                {' '}
                <Link className="text-link" href="/entrar">
                  Entrar novamente
                </Link>
              </>
            )}
          </div>
        )}
        {uncertain && (
          <div className="notice warning">
            <p>
              Uma resposta ausente não informa se a operação terminou. Verifique antes de criar
              outra proposta.
            </p>
            <div className="row-actions">
              <button
                className="btn secondary"
                disabled={busy || expired}
                onClick={() => execute({ action: 'recover', id: uncertain })}
              >
                Verificar tentativa
              </button>
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() => {
                  setUncertain(undefined);
                  setError('Confira a lista de lançamentos antes de enviar outra movimentação.');
                }}
              >
                Encerrar esta tentativa
              </button>
              <Link className="text-link" href="/lancamentos">
                Conferir lançamentos
              </Link>
            </div>
          </div>
        )}
        <form onSubmit={send} className="form chat-composer">
          <label htmlFor="tato-message">
            Sua mensagem
            <textarea
              ref={textarea}
              id="tato-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={busy || !!proposal || !!uncertain || expired || !!unavailable}
              placeholder="Conte ao Tato o que você precisa…"
              required
              aria-describedby="message-help"
            />
          </label>
          <p id="message-help" className="field-help">
            {proposal
              ? 'Revise, confirme ou cancele a proposta para continuar.'
              : `${message.length}/2.000 caracteres. Até 5 mensagens/minuto e 20/dia por pessoa.`}
          </p>
          <div className="row-actions">
            <button
              type="submit"
              className="btn primary"
              disabled={
                busy || !message.trim() || !!proposal || !!uncertain || expired || !!unavailable
              }
            >
              Enviar mensagem
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy || !!proposal || !!uncertain}
              onClick={() => {
                setRows([]);
                setContext(undefined);
                setError('');
                textarea.current?.focus();
              }}
            >
              Nova conversa
            </button>
          </div>
        </form>
      </section>
      <p className="field-help">
        O contexto e as propostas valem por até 15 minutos. O conteúdo fica somente na memória desta
        aba até fechar ou recarregar. Lançamentos confirmados ficam no banco e aparecem na lista e
        no painel.{' '}
        <Link className="text-link" href="/lancamentos/novo">
          Usar formulário manual
        </Link>
      </p>
    </div>
  );
}
function Correction({
  proposal,
  accounts,
  categories,
  busy,
  onSave,
  onClose,
}: {
  proposal: ProposalView;
  accounts: Choice[];
  categories: CategoryChoice[];
  busy: boolean;
  onSave: (content: ProposalView['content']) => Promise<void>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState(proposal.content.kind);
  const [error, setError] = useState('');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError('');
    try {
      await onSave({
        kind,
        description: String(f.get('description')),
        amount_cents: parseMoney(String(f.get('amount'))),
        account_id: String(f.get('account')),
        category_id: String(f.get('category')),
        occurred_on: String(f.get('date')),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Confira os campos.');
    }
  }
  return (
    <form className="form" onSubmit={save}>
      <fieldset disabled={busy} className="chat-edit">
        <legend>Corrigir proposta</legend>
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="expense">Despesa realizada</option>
            <option value="income">Receita recebida</option>
          </select>
        </label>
        <label>
          Valor (R$)
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={moneyInput(proposal.content.amount_cents)}
            maxLength={20}
          />
        </label>
        <label>
          Descrição
          <input
            name="description"
            defaultValue={proposal.content.description}
            required
            maxLength={120}
          />
        </label>
        <label>
          Data realizada
          <input
            name="date"
            type="date"
            defaultValue={proposal.content.occurred_on}
            min="1900-01-01"
            max={todaySP()}
            required
          />
        </label>
        <label>
          Conta
          <select name="account" defaultValue={proposal.content.account_id} required>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoria
          <select
            key={kind}
            name="category"
            defaultValue={kind === proposal.content.kind ? proposal.content.category_id : ''}
            required
          >
            <option value="">Selecione</option>
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="row-actions">
          <button className="btn primary" type="submit">
            Salvar nova versão para revisão
          </button>
          <button className="btn secondary" type="button" onClick={onClose}>
            Voltar à revisão
          </button>
        </div>
      </fieldset>
    </form>
  );
}
