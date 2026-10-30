'use client';
import { useState, useId } from 'react';
import type { Account, Category, Commitment, Transaction, Kind } from '@/lib/types';
import { ArrowUpRight, ArrowDownLeft, Check } from 'lucide-react';
import { moneyInput } from '@/lib/finance/money';
import { dateBR } from '@/lib/finance/dates';
export function AccountFields({
  account,
  today,
  locked = false,
}: {
  account?: Account;
  today: string;
  locked?: boolean;
}) {
  return (
    <>
      <label>
        Nome da conta
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={account?.name}
          placeholder="Ex.: Conta do dia a dia"
          autoComplete="off"
        />
      </label>
      <label>
        Saldo inicial (R$)
        <input
          name="initial_balance_cents"
          required
          type="text"
          inputMode="decimal"
          readOnly={locked}
          defaultValue={account ? moneyInput(account.initial_balance_cents) : '0,00'}
          aria-describedby="balance-help"
        />
      </label>
      <label>
        Data de referência do saldo
        <input
          name="reference_date"
          required
          type="date"
          min="1900-01-01"
          max={today}
          readOnly={locked}
          defaultValue={account?.reference_date || today}
        />
      </label>
      <p className="field-help" id="balance-help">
        {locked
          ? 'O saldo inicial e a referência ficam fixos após o primeiro lançamento. Você pode editar o nome da conta.'
          : 'Pode ser negativo. Informe o saldo antes das movimentações dessa data. Não será possível registrar lançamentos anteriores à referência.'}
      </p>
    </>
  );
}
export function EntryFields({
  accounts,
  categories,
  today,
  entry,
  future = false,
  initialKind = 'expense',
  featured = false,
}: {
  accounts: Account[];
  categories: Category[];
  today: string;
  entry?: Transaction | Commitment;
  future?: boolean;
  initialKind?: Kind;
  featured?: boolean;
}) {
  const amountId = useId();
  const [kind, setKind] = useState<Kind>(entry?.kind || initialKind);
  const [category, setCategory] = useState(entry?.category_id || '');
  const active = accounts.filter((a) => !a.archived);
  const [account, setAccount] = useState(
    entry?.account_id || (!future && active.length === 1 ? active[0].id : ''),
  );
  const [date, setDate] = useState(
    entry ? ('due_on' in entry ? entry.due_on : entry.occurred_on) : today,
  );
  const selected = accounts.find((a) => a.id === account);
  const options = accounts.filter((a) => !a.archived || a.id === entry?.account_id);
  return (
    <>
      <fieldset className="kind-switch">
        <legend className="sr-only">Tipo</legend>
        {(['expense', 'income'] as const).map((value) => (
          <label key={value} className={kind === value ? 'selected' : ''}>
            <input
              type="radio"
              name="kind"
              value={value}
              checked={kind === value}
              onChange={() => {
                setKind(value);
                setCategory('');
              }}
            />
            {value === 'expense' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
            <span>
              {value === 'expense'
                ? future
                  ? 'Conta a pagar'
                  : 'Despesa realizada'
                : future
                  ? 'Entrada prevista'
                  : 'Receita recebida'}
            </span>
            {kind === value && <Check size={13} className="selected-check" aria-hidden="true" />}
          </label>
        ))}
      </fieldset>
      {featured && (
        <div className="amount-entry">
          <label htmlFor={amountId}>Valor (R$)</label>
          <input
            id={amountId}
            name="amount_cents"
            type="text"
            inputMode="decimal"
            required
            defaultValue={entry ? moneyInput(entry.amount_cents) : ''}
            placeholder="0,00"
            aria-describedby={`${amountId}-help`}
          />
          <p id={`${amountId}-help`} className="field-help">
            Use um valor positivo, como 1.234,56.
          </p>
        </div>
      )}

      <label>
        Descrição
        <input
          name="description"
          required
          maxLength={120}
          defaultValue={entry?.description}
          placeholder={future ? 'Ex.: Aluguel de novembro' : 'Ex.: Compras da semana'}
        />
      </label>
      {!featured && (
        <>
          <label>
            Valor (R$)
            <input
              name="amount_cents"
              type="text"
              inputMode="decimal"
              required
              defaultValue={entry ? moneyInput(entry.amount_cents) : ''}
              placeholder="0,00"
              aria-describedby="amount-help"
            />
          </label>
          <p id="amount-help" className="field-help">
            Informe um valor positivo, como 1.234,56.
          </p>
        </>
      )}
      <div className="form-grid">
        <div className="civil-date-field">
          <label>
            {future ? 'Vencimento' : 'Data realizada'}
            <input
              name={future ? 'due_on' : 'occurred_on'}
              type="date"
              required
              min={future ? '1900-01-01' : selected?.reference_date || '1900-01-01'}
              max={future ? undefined : today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {date && (
            <p className="field-help civil-date-preview">
              {date === today ? 'Hoje · ' : ''}
              {dateBR(date)}
            </p>
          )}
        </div>
        <label>
          {future ? 'Conta prevista (opcional)' : 'Conta'}
          <select
            name="account_id"
            aria-label={future ? 'Conta prevista (opcional)' : 'Conta'}
            required={!future}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="">{future ? 'Decidir depois' : 'Escolha uma conta'}</option>
            {options.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.archived ? ' (arquivada)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Categoria
        <select
          name="category_id"
          aria-label="Categoria"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Escolha uma categoria</option>
          {categories
            .filter((c) => c.kind === kind)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </label>
      <p className="field-help">
        {future
          ? 'A previsão só altera o saldo registrado quando você marcar como pago ou recebido.'
          : 'Para datas futuras, use Compromissos. Transferências entre contas ainda não estão disponíveis.'}
      </p>
    </>
  );
}
