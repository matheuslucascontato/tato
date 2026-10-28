import { z } from 'zod';
import { validDate, todaySP } from './finance/dates';
import { parseMoney } from './finance/money';
export const idSchema = z.uuid('Identificador inválido.');
export const textSchema = z
  .string()
  .trim()
  .min(1, 'Preencha a descrição.')
  .max(120, 'Use até 120 caracteres.');
export const civilSchema = z
  .string()
  .refine(validDate, 'Informe uma data válida (a partir de 1900).');
export const realizedSchema = civilSchema.refine(
  (d) => d <= todaySP(),
  'Para datas futuras, cadastre um compromisso.',
);
const amount = z.string().transform((v, ctx) => {
  try {
    return parseMoney(v);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: (e as Error).message });
    return z.NEVER;
  }
});
const balance = z.string().transform((v, ctx) => {
  try {
    return parseMoney(v, true);
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: (e as Error).message });
    return z.NEVER;
  }
});
export const accountSchema = z.object({
  name: textSchema,
  initial_balance_cents: balance,
  reference_date: realizedSchema,
});
export const entrySchema = z.object({
  description: textSchema,
  amount_cents: amount,
  kind: z.enum(['income', 'expense']),
  category_id: idSchema,
  account_id: idSchema,
  occurred_on: realizedSchema,
});
export const commitmentSchema = z.object({
  description: textSchema,
  amount_cents: amount,
  kind: z.enum(['income', 'expense']),
  category_id: idSchema,
  account_id: z.union([idSchema, z.literal('')]).transform((v) => v || null),
  due_on: civilSchema,
});
export const categorySchema = z.object({ name: textSchema, kind: z.enum(['income', 'expense']) });
export const emailSchema = z.email('Informe um e-mail válido.').max(254);
export const passwordSchema = z
  .string()
  .min(8, 'Use uma senha com pelo menos 8 caracteres.')
  .max(128, 'Use até 128 caracteres.');
