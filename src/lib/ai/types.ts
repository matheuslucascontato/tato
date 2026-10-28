import { z } from 'zod';
import { civilSchema, idSchema, textSchema } from '@/lib/validation';
import { MAX_CENTS } from '@/lib/finance/money';
export const contentSchema = z.strictObject({
  kind: z.enum(['income', 'expense']),
  description: textSchema,
  amount_cents: z.number().int().positive().max(MAX_CENTS),
  account_id: idSchema,
  category_id: idSchema,
  occurred_on: civilSchema,
});
export type ProposalContent = z.infer<typeof contentSchema>;
export type ProposalState = {
  id: string;
  user_id: string;
  version: number;
  status: 'pending' | 'cancelled' | 'confirmed';
  fingerprint: string;
  expires_at: string;
  created_at: string;
};
export type ProposalView = {
  id: string;
  version: number;
  expires_at: string;
  token: string;
  content: ProposalContent;
  account_name: string;
  category_name: string;
};
export type Summary = {
  title: string;
  period: string;
  values: { label: string; value: string }[];
  note: string;
};
export type ChatResult = {
  message: string;
  context?: string;
  proposal?: ProposalView;
  summary?: Summary;
  href?: string;
  transaction_id?: string;
};
export const messageSchema = z.strictObject({
  action: z.literal('message'),
  request_id: idSchema,
  message: z.string().trim().min(1).max(2000, 'Use até 2.000 caracteres.'),
  context: z.string().max(12000).optional(),
});
const reference = {
  id: idSchema,
  version: z.number().int().positive(),
  token: z.string().max(4000),
};
export const commandSchema = z.discriminatedUnion('action', [
  messageSchema,
  z.strictObject({ action: z.literal('confirm'), ...reference }),
  z.strictObject({ action: z.literal('cancel'), id: idSchema, version: reference.version }),
  z.strictObject({ action: z.literal('revise'), ...reference, content: contentSchema }),
  z.strictObject({ action: z.literal('recover'), id: idSchema }),
]);
export type Command = z.infer<typeof commandSchema>;
