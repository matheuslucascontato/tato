import type { Account, Commitment, Transaction } from '@/lib/types';
import { monthEnd } from './dates';
export function accountBalance(account: Account, transactions: Transaction[]): bigint {
  return transactions
    .filter((t) => t.account_id === account.id)
    .reduce(
      (sum, t) => sum + (t.kind === 'income' ? 1n : -1n) * BigInt(t.amount_cents),
      BigInt(account.initial_balance_cents),
    );
}
export function dashboard(
  accounts: Account[],
  transactions: Transaction[],
  commitments: Commitment[],
  month: string,
  today: string,
) {
  const balance = accounts.reduce((sum, a) => sum + accountBalance(a, transactions), 0n);
  const realized = transactions.filter((t) => t.occurred_on.slice(0, 7) === month);
  const total = (kind: 'income' | 'expense') =>
    realized.filter((t) => t.kind === kind).reduce((sum, t) => sum + BigInt(t.amount_cents), 0n);
  const end = monthEnd(today.slice(0, 7));
  const pending = commitments.filter((c) => c.status === 'pending' && c.due_on <= end);
  const incoming = pending
    .filter((c) => c.kind === 'income')
    .reduce((s, c) => s + BigInt(c.amount_cents), 0n);
  const outgoing = pending
    .filter((c) => c.kind === 'expense')
    .reduce((s, c) => s + BigInt(c.amount_cents), 0n);
  return {
    balance,
    income: total('income'),
    expense: total('expense'),
    incoming,
    outgoing,
    projected: balance + incoming - outgoing,
    end,
    overdue: pending.filter((c) => c.due_on < today),
  };
}
export function assertRealizedDate(date: string, reference: string, today: string) {
  if (date < reference)
    throw new Error('A data deve ser igual ou posterior à referência do saldo inicial.');
  if (date > today) throw new Error('Para datas futuras, cadastre um compromisso.');
}
