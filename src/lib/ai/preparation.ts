import { z } from 'zod';
import type { Snapshot } from '@/lib/types';
import { assertRealizedDate } from '@/lib/finance/calculations';
import { parseMoney } from '@/lib/finance/money';
import { validDate } from '@/lib/finance/dates';
import { AiError } from './errors';
import { contentSchema, type ProposalContent } from './types';
export const prepareSchema = z.strictObject({
  kind: z.enum(['income', 'expense']).nullable(),
  amount: z.string().max(40).nullable(),
  description: z.string().max(120).nullable(),
  date_expression: z.string().max(30).nullable(),
  account_id: z.string().nullable(),
  category_id: z.string().nullable(),
});
export const questions = {
  amount: 'Qual foi o valor exato? Use, por exemplo, 35,00.',
  date: 'Em que data aconteceu? Informe hoje, ontem ou uma data como 28/10/2026.',
  account: 'Em qual conta aconteceu? Escolha uma das suas contas ativas.',
  category: 'Qual categoria existente você quer usar?',
  kind: 'Foi uma receita recebida ou uma despesa já realizada?',
  description: 'Como você quer descrever este lançamento?',
  ambiguity:
    'Preciso de um detalhe: descreva uma única movimentação já realizada, com valor, data e conta. Se houver dúvida no valor ou na data, confirme o dado exato.',
  request:
    'Posso consultar seus totais ou preparar uma receita/despesa para revisão. O que você precisa?',
};
export function resolveDate(expression: string, today: string): string | null {
  const v = expression.toLocaleLowerCase('pt-BR').trim();
  if (v === 'hoje') return today;
  if (v === 'ontem') {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  const full = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  const date = full ? `${full[3]}-${full[2]}-${full[1]}` : v;
  return validDate(date) ? date : null;
}
export function isFutureIntent(message: string) {
  return /(?<![\p{L}])(vou|vamos|irei|pretendo|pagarei|receberei|amanhã|amanha|próxim[oa]|proxim[oa]|previst[oa]|vencer|vencimento|a pagar|a receber|semana que vem)(?![\p{L}])/iu.test(
    message,
  );
}
export function validateContent(content: unknown, data: Snapshot, today: string): ProposalContent {
  const c = contentSchema.parse(content);
  const account = data.accounts.find((a) => a.id === c.account_id);
  const category = data.categories.find((a) => a.id === c.category_id && a.kind === c.kind);
  if (!account || account.archived || !category)
    throw new AiError(
      'ownership',
      'Escolha uma conta ativa e uma categoria suas, compatíveis com o tipo.',
    );
  assertRealizedDate(c.occurred_on, account.reference_date, today);
  return c;
}
export function prepareContent(
  args: unknown,
  data: Snapshot,
  today: string,
  messages: string[],
): { content: ProposalContent } | { question: string } {
  const a = prepareSchema.parse(args);
  const source = messages.join('\n');
  if (
    /(transfer[êe]ncia|transferi|transferir|estornar|excluir|editar|quitar|liquidar)/iu.test(source)
  )
    throw new AiError(
      'manual',
      'Esta conversa prepara somente novos lançamentos. Use as telas manuais para outras operações; transferências entre contas ainda não estão disponíveis.',
    );
  if (isFutureIntent(source))
    throw new AiError(
      'future',
      'Para valores futuros, use a tela de Compromissos. Nada foi lançado.',
    );
  if (!a.kind) return { question: questions.kind };
  if (!a.amount) return { question: questions.amount };
  const amount = parseMoney(a.amount);
  // Ground the amount in user-authored data, never in account/category names.
  const amountSource =
    [...messages]
      .reverse()
      .find((m) => /\d/.test(m.replace(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, ''))) ||
    '';
  const numbers =
    amountSource
      .replace(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '')
      .match(/-?\d[\d.,]*/g) || [];
  const amounts = numbers.flatMap((v) => {
    try {
      return [parseMoney(v.replace(/[.,]$/, ''))];
    } catch {
      return [];
    }
  });
  if (!amounts.includes(amount) || amounts.length > 1) return { question: questions.amount };
  if (
    !a.date_expression ||
    !source.toLocaleLowerCase('pt-BR').includes(a.date_expression.toLocaleLowerCase('pt-BR'))
  )
    return { question: questions.date };
  const datePattern = /hoje|ontem|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/giu;
  const latestDateMessage =
    [...messages].reverse().find((m) => {
      datePattern.lastIndex = 0;
      return datePattern.test(m);
    }) || '';
  const dates = latestDateMessage.match(datePattern) || [];
  if (new Set(dates.map((d) => resolveDate(d, today))).size > 1)
    return { question: questions.date };
  const date = resolveDate(a.date_expression, today);
  if (!date) return { question: questions.date };
  if (date > today)
    throw new AiError(
      'future',
      'Para datas futuras, use a tela de Compromissos. Nada foi lançado.',
    );
  const accounts = data.accounts.filter((a) => !a.archived);
  if (!a.account_id && accounts.length !== 1) return { question: questions.account };
  const selected = accounts.find((account) => account.id === a.account_id);
  if (
    accounts.length > 1 &&
    selected &&
    !source.toLocaleLowerCase('pt-BR').includes(selected.name.toLocaleLowerCase('pt-BR'))
  )
    return { question: questions.account };
  if (!a.category_id) return { question: questions.category };
  if (!a.description) return { question: questions.description };
  return {
    content: validateContent(
      {
        kind: a.kind,
        description: a.description,
        amount_cents: amount,
        account_id: a.account_id || accounts[0]?.id,
        category_id: a.category_id,
        occurred_on: date,
      },
      data,
      today,
    ),
  };
}
