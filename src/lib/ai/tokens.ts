import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { signingKey } from './config';
import { AiError } from './errors';
import { contentSchema } from './types';
const contextSchema = z.strictObject({
  user: z.string(),
  expires: z.number().int(),
  messages: z.array(z.string().max(2000)).max(3),
});
const proposalSchema = z.strictObject({
  user: z.string(),
  expires: z.number().int(),
  id: z.string(),
  version: z.number().int(),
  content: contentSchema,
});
// Purpose-separated HMAC key derived in server memory. No additional secret setup,
// no key sent to the browser/database. Rotating the API key invalidates open tokens.
function mac(purpose: string, body: string) {
  const derived = createHmac('sha256', signingKey()).update(`tato/ai/v1/${purpose}`).digest();
  return createHmac('sha256', derived).update(body).digest();
}
export function seal(purpose: 'context' | 'proposal', value: unknown): string {
  const body = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${body}.${mac(purpose, body).toString('base64url')}`;
}
function open(token: string, purpose: 'context' | 'proposal'): unknown {
  if (token.length > 12000)
    throw new AiError('invalid_token', 'Contexto inválido. Inicie uma nova conversa.');
  const [body, signature, extra] = token.split('.');
  const supplied = Buffer.from(signature || '', 'base64url');
  const expected = mac(purpose, body || '');
  if (!body || extra || supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
    throw new AiError(
      'invalid_token',
      'A proposta ou o contexto foi alterado. Inicie uma nova mensagem.',
    );
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new AiError('invalid_token', 'Contexto inválido. Inicie uma nova conversa.');
  }
}
export function readContext(token: string | undefined, user: string): string[] {
  if (!token) return [];
  const value = contextSchema.parse(open(token, 'context'));
  if (value.user !== user || value.expires <= Date.now())
    throw new AiError('expired', 'A conversa expirou. Envie sua mensagem em uma nova conversa.');
  return value.messages;
}
export function nextContext(messages: string[], user: string) {
  const bounded = messages.slice(-3);
  let token: string;
  do {
    token = seal('context', { user, expires: Date.now() + 15 * 60_000, messages: bounded });
    if (token.length <= 12000) return token;
    bounded.shift();
  } while (bounded.length);
  return seal('context', { user, expires: Date.now() + 15 * 60_000, messages: [] });
}
export function readProposal(token: string, user: string, id: string, version: number) {
  const value = proposalSchema.parse(open(token, 'proposal'));
  if (value.user !== user || value.id !== id || value.version !== version)
    throw new AiError('invalid_token', 'A proposta não corresponde a esta sessão ou versão.');
  if (value.expires <= Date.now())
    throw new AiError('expired', 'A proposta expirou. Prepare um novo lançamento.');
  return value.content;
}
