import Link from 'next/link';
import type { Account } from '@/lib/types';
export function TransactionFilters({
  from,
  to,
  kind,
  account,
  accounts,
}: {
  from: string;
  to: string;
  kind: string;
  account: string;
  accounts: Account[];
}) {
  return (
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
        <select name="kind" aria-label="Tipo" defaultValue={kind || ''}>
          <option value="">Todos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
      </label>
      <label>
        Conta
        <select name="account" aria-label="Conta" defaultValue={account || ''}>
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
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
  );
}
