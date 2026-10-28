import 'server-only';
import { AiError } from './errors';
export function aiConfig() {
  if (process.env.TATO_AI_ENABLED === 'false')
    throw new AiError(
      'disabled',
      'Novas conversas com IA estão pausadas. Você pode continuar usando as telas manuais.',
      503,
    );
  const apiKey = signingKey();
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  if (!/^[a-zA-Z0-9._-]{1,100}$/.test(model))
    throw new AiError(
      'configuration',
      'OPENAI_MODEL inválido. Confira a configuração de servidor.',
      503,
    );
  return { apiKey, model };
}
export function signingKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    throw new AiError(
      'configuration',
      'IA ainda não configurada: defina OPENAI_API_KEY no servidor de Preview. O controle manual continua disponível.',
      503,
    );
  return key;
}
