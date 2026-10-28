import { z } from 'zod';
import type { Snapshot } from '@/lib/types';
import { dashboard, accountBalance } from '@/lib/finance/calculations';
import { dateBR, monthEnd } from '@/lib/finance/dates';
import { money } from '@/lib/finance/money';
import { civilSchema, idSchema } from '@/lib/validation';
import { AiError } from './errors';
import type { Summary } from './types';
export const summarySchema = z.strictObject({
  scope: z.enum(['balance', 'period', 'projection']),
  start: civilSchema.nullable(),
  end: civilSchema.nullable(),
  account_id: idSchema.nullable(),
  category_id: idSchema.nullable(),
  kind: z.enum(['all', 'income', 'expense']),
});
export function readSummary(data: Snapshot, args: unknown, today: string): Summary {
  const q = summarySchema.parse(args);
  const account = q.account_id ? data.accounts.find((a) => a.id === q.account_id) : undefined;
  const category = q.category_id ? data.categories.find((c) => c.id === q.category_id) : undefined;
  if ((q.account_id && !account) || (q.category_id && !category))
    throw new AiError('ownership', 'A conta ou categoria não está disponível para esta sessão.');
  const archived = data.accounts.some(
    (a) => a.archived && accountBalance(a, data.transactions) !== 0n,
  )
    ? ' Há contas arquivadas com saldo incluídas no consolidado.'
    : '';
  if (q.scope === 'balance') {
    if (q.category_id)
      throw new AiError(
        'clarification',
        'Saldo é acumulado por conta, sem categoria. Consulte gastos por período para filtrar categorias.',
      );
    const accounts = account ? [account] : data.accounts;
    const total = accounts.reduce((s, a) => s + accountBalance(a, data.transactions), 0n);
    return {
      title: 'Saldo registrado',
      period: `Até ${dateBR(today)}`,
      values: [
        { label: account ? account.name : 'Consolidado', value: money(total) },
        ...(!account
          ? accounts.slice(0, 20).map((a) => ({
              label: `${a.name}${a.archived ? ' (arquivada)' : ''}`,
              value: money(accountBalance(a, data.transactions)),
            }))
          : []),
      ],
      note:
        'Saldo inicial + receitas realizadas − despesas realizadas. Valores informados por você; sem sincronização bancária.' +
        archived,
    };
  }
  if (q.scope === 'projection') {
    if (q.account_id || q.category_id)
      throw new AiError(
        'clarification',
        'A folga desta versão considera todas as contas e compromissos cadastrados. Pergunte pela folga consolidada.',
      );
    const d = dashboard(
      data.accounts,
      data.transactions,
      data.commitments,
      today.slice(0, 7),
      today,
    );
    return {
      title: 'Folga prevista — estimativa',
      period: `Até ${dateBR(monthEnd(today.slice(0, 7)))}, incluindo pendências vencidas`,
      values: [
        { label: 'Saldo registrado atual', value: money(d.balance) },
        { label: 'Entradas ainda previstas', value: money(d.incoming) },
        { label: 'Saídas ainda pendentes', value: money(d.outgoing) },
        { label: 'Folga estimada', value: money(d.projected) },
      ],
      note:
        'Estimativa baseada somente no que você cadastrou: saldo registrado + entradas pendentes − saídas pendentes até o fim do mês atual. Não inclui cancelados nem conta novamente os liquidados. Não é saldo bancário nem garantia de dinheiro disponível.' +
        archived,
    };
  }
  const start = q.start,
    end = q.end === monthEnd(today.slice(0, 7)) ? today : q.end;
  if (
    !start ||
    !end ||
    start > end ||
    end > today ||
    Number(end.slice(0, 4)) - Number(start.slice(0, 4)) > 5
  )
    throw new AiError(
      'clarification',
      'Qual período você quer consultar? Informe datas passadas válidas, em um intervalo de até cinco anos.',
    );
  if (category && q.kind !== 'all' && category.kind !== q.kind)
    throw new AiError(
      'clarification',
      'A categoria escolhida não corresponde ao tipo. Confira a consulta.',
    );
  const rows = data.transactions.filter(
    (t) =>
      t.occurred_on >= start &&
      t.occurred_on <= end &&
      (!account || t.account_id === account.id) &&
      (!category || t.category_id === category.id) &&
      (q.kind === 'all' || t.kind === q.kind),
  );
  const total = (kind: string) =>
    rows.filter((t) => t.kind === kind).reduce((s, t) => s + BigInt(t.amount_cents), 0n);
  return {
    title: `Realizados${category ? ' · ' + category.name : ''}${account ? ' · ' + account.name : ''}`,
    period: `${dateBR(start)} a ${dateBR(end)}`,
    values: [
      ...(q.kind !== 'expense'
        ? [{ label: 'Receitas recebidas', value: money(total('income')) }]
        : []),
      ...(q.kind !== 'income'
        ? [{ label: 'Despesas realizadas', value: money(total('expense')) }]
        : []),
      ...(!category
        ? data.categories
            .filter((c) => rows.some((t) => t.category_id === c.id))
            .slice(0, 40)
            .map((c) => ({
              label: `${c.name} (${c.kind === 'income' ? 'receitas' : 'despesas'})`,
              value: money(
                rows
                  .filter((t) => t.category_id === c.id)
                  .reduce((s, t) => s + BigInt(t.amount_cents), 0n),
              ),
            }))
        : []),
    ],
    note: 'Somente lançamentos realizados no período. Previsões ficam nos compromissos. O filtro não altera o saldo acumulado das contas.',
  };
}
