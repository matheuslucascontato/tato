import type { Snapshot } from '@/lib/types';
export const USER = '60000000-0000-4000-8000-000000000001';
export const ACCOUNT = '60000000-0000-4000-8000-000000000002';
export const EXPENSE = '60000000-0000-4000-8000-000000000003';
export const INCOME = '60000000-0000-4000-8000-000000000004';
export const TODAY = '2026-10-30';
const audit = {
  user_id: USER,
  created_at: '2026-10-01T12:00:00Z',
  updated_at: '2026-10-01T12:00:00Z',
};
/** Explicit synthetic data used ONLY by the isolated browser harness, never app getData. */
export function fixture(): Snapshot {
  return {
    profile: { ...audit, display_name: 'Pessoa de teste' },
    accounts: [
      {
        ...audit,
        id: ACCOUNT,
        name: 'Carteira de teste',
        initial_balance_cents: 50000,
        reference_date: '2026-10-01',
        archived: false,
      },
    ],
    categories: [
      { ...audit, id: EXPENSE, name: 'Alimentação', kind: 'expense' },
      { ...audit, id: INCOME, name: 'Outras entradas', kind: 'income' },
    ],
    transactions: [
      {
        ...audit,
        id: '60000000-0000-4000-8000-000000000010',
        account_id: ACCOUNT,
        category_id: INCOME,
        kind: 'income',
        amount_cents: 200000,
        description: 'Entrada de teste',
        occurred_on: TODAY,
        commitment_id: null,
      },
      {
        ...audit,
        id: '60000000-0000-4000-8000-000000000011',
        account_id: ACCOUNT,
        category_id: EXPENSE,
        kind: 'expense',
        amount_cents: 15000,
        description: 'Gasto de teste',
        occurred_on: TODAY,
        commitment_id: null,
      },
    ],
    commitments: [
      {
        ...audit,
        id: '60000000-0000-4000-8000-000000000020',
        account_id: ACCOUNT,
        category_id: EXPENSE,
        kind: 'expense',
        amount_cents: 30000,
        description: 'Compromisso de teste',
        due_on: '2026-10-28',
        status: 'pending',
      },
      {
        ...audit,
        id: '60000000-0000-4000-8000-000000000021',
        account_id: null,
        category_id: INCOME,
        kind: 'income',
        amount_cents: 40000,
        description: 'Entrada prevista de teste',
        due_on: '2026-10-31',
        status: 'pending',
      },
    ],
  };
}
