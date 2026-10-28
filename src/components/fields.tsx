'use client';
import { useState } from 'react';
import type { Account, Category, Commitment, Transaction, Kind } from '@/lib/types';
import { moneyInput } from '@/lib/finance/money';
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
}: {
  accounts: Account[];
  categories: Category[];
  today: string;
  entry?: Transaction | Commitment;
  future?: boolean;
}) {
  const [kind, setKind] = useState<Kind>(entry?.kind || 'expense');
  const [category, setCategory] = useState(entry?.category_id || '');
  const [account, setAccount] = useState(entry?.account_id || '');
  const selected = accounts.find((a) => a.id === account);
  const options = accounts.filter((a) => !a.archived || a.id === entry?.account_id);
  return (
    <>
      <label>
        Tipo
        <select
          name="kind"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as Kind);
            setCategory('');
          }}
        >
          <option value="expense">{future ? 'Conta a pagar' : 'Despesa realizada'}</option>
          <option value="income">{future ? 'Entrada prevista' : 'Receita recebida'}</option>
        </select>
      </label>
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
      <div className="form-grid">
        <label>
          {future ? 'Vencimento' : 'Data realizada'}
          <input
            name={future ? 'due_on' : 'occurred_on'}
            type="date"
            required
            min={future ? '1900-01-01' : selected?.reference_date || '1900-01-01'}
            max={future ? undefined : today}
            defaultValue={entry ? ('due_on' in entry ? entry.due_on : entry.occurred_on) : today}
          />
        </label>
        <label>
          {future ? 'Conta prevista (opcional)' : 'Conta'}
          <select
            name="account_id"
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
