import { describe, it, expect } from 'vitest';
import { parseMoney, money } from '@/lib/finance/money';
import { todaySP, validDate } from '@/lib/finance/dates';
import { dashboard, accountBalance, assertRealizedDate } from '@/lib/finance/calculations';
import type { Account, Transaction, Commitment } from '@/lib/types';
const a = { id: 'a', initial_balance_cents: 50000 } as Account;
const t = (id: string, kind: 'income' | 'expense', amount: number) =>
  ({ id, account_id: 'a', kind, amount_cents: amount, occurred_on: '2026-10-05' }) as Transaction;
const c = (id: string, kind: 'income' | 'expense', amount: number, due = '2026-10-15') =>
  ({ id, kind, amount_cents: amount, due_on: due, status: 'pending' }) as Commitment;
describe('dinheiro sem arredondamento binário', () => {
  it('converte notação brasileira e centavos exatos', () => {
    expect(parseMoney('1.234,56')).toBe(123456);
    expect(parseMoney('0,01')).toBe(1);
    expect(parseMoney('1234,5')).toBe(123450);
    expect(parseMoney('10')).toBe(1000);
  });
  it('aceita saldo negativo e zero somente quando autorizado', () => {
    expect(parseMoney('-123,45', true)).toBe(-12345);
    expect(parseMoney('0', true)).toBe(0);
    expect(() => parseMoney('-1')).toThrow();
    expect(() => parseMoney('0')).toThrow();
  });
  it.each([
    '1,234.56',
    '1.23',
    '12.34,56',
    '1,234',
    '1e3',
    'Infinity',
    'NaN',
    '99999999999999',
    '',
    '+10',
    '--1',
  ])('rejeita valor inválido %s', (v) => expect(() => parseMoney(v)).toThrow());
  it('limita o valor e formata negativos sem floats', () => {
    expect(parseMoney('999.999.999,99')).toBe(99999999999);
    expect(() => parseMoney('1.000.000.000,00')).toThrow();
    expect(money(-123456n)).toBe('− R$ 1.234,56');
  });
});
describe('saldos e projeções', () => {
  it('reproduz o cenário obrigatório antes e depois da quitação', () => {
    const transactions = [t('salary', 'income', 200000), t('food', 'expense', 15000)];
    const commitments = [c('bill', 'expense', 30000), c('expected', 'income', 40000)];
    const first = dashboard([a], transactions, commitments, '2026-10', '2026-10-20');
    expect(first.balance).toBe(235000n);
    expect(first.projected).toBe(245000n);
    expect(first.overdue).toHaveLength(2);
    const paid = [{ ...commitments[0], status: 'settled' as const }, commitments[1]];
    const movement = t('payment', 'expense', 30000);
    const after = dashboard([a], [...transactions, movement], paid, '2026-10', '2026-10-20');
    expect(after.balance).toBe(205000n);
    expect(after.projected).toBe(245000n);
  });
  it('recalcula edições/exclusões e aceita saldo inicial negativo', () => {
    const account = { ...a, initial_balance_cents: -5000 };
    expect(accountBalance(account, [t('1', 'income', 10000)])).toBe(5000n);
    expect(accountBalance(account, [t('1', 'income', 7000)])).toBe(2000n);
    expect(accountBalance(account, [])).toBe(-5000n);
  });
  it('inclui atrasados de outros meses e exclui cancelados, liquidados e próximos meses', () => {
    const rows = [
      c('old', 'expense', 30000, '2026-09-01'),
      { ...c('cancel', 'expense', 99999), status: 'cancelled' as const },
      { ...c('paid', 'income', 99999), status: 'settled' as const },
      c('future', 'expense', 99999, '2026-11-01'),
    ];
    expect(dashboard([a], [], rows, '2026-09', '2026-10-20').projected).toBe(20000n);
  });
  it('filtro mensal não altera consolidado e conta arquivada continua no total', () => {
    const result = dashboard(
      [{ ...a, archived: true }],
      [t('1', 'income', 1000)],
      [],
      '2026-09',
      '2026-10-20',
    );
    expect(result.balance).toBe(51000n);
    expect(result.income).toBe(0n);
  });
  it('acumula acima do limite de inteiro seguro usando bigint', () => {
    const rows = Array.from({ length: 100000 }, (_, i) => t(String(i), 'income', 99999999999));
    expect(accountBalance(a, rows)).toBe(9999999999950000n);
  });
});
describe('datas civis de São Paulo', () => {
  it('não muda o dia por UTC e valida dias reais', () => {
    expect(todaySP(new Date('2026-10-02T01:00:00Z'))).toBe('2026-10-01');
    expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2024-02-29')).toBe(true);
  });
  it('bloqueia passado anterior à referência e lançamento futuro', () => {
    expect(() => assertRealizedDate('2026-09-30', '2026-10-01', '2026-10-20')).toThrow();
    expect(() => assertRealizedDate('2026-10-21', '2026-10-01', '2026-10-20')).toThrow();
    expect(() => assertRealizedDate('2026-10-01', '2026-10-01', '2026-10-20')).not.toThrow();
  });
});
