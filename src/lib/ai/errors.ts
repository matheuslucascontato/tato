import OpenAI from 'openai';
export class AiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function providerError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  if (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name))
  )
    return new AiError(
      'timeout',
      'A IA demorou para responder. A tentativa foi consumida e não será repetida automaticamente. Nenhum lançamento foi gravado. Confira a recuperação desta tentativa antes de enviar outra.',
      504,
    );
  if (error instanceof OpenAI.APIError) {
    if (error.code === 'insufficient_quota' || error.code === 'billing_hard_limit_reached')
      return new AiError(
        'billing',
        'A API de IA está sem crédito ou com faturamento indisponível. O responsável pela prévia precisa conferir o projeto OpenAI.',
        503,
      );
    if (error.status === 401)
      return new AiError(
        'invalid_key',
        'A credencial da IA foi recusada. O responsável pela prévia precisa revisar OPENAI_API_KEY.',
        503,
      );
    if (error.status === 403 || error.status === 404 || error.code === 'model_not_found')
      return new AiError(
        'model_access',
        'O modelo configurado não está disponível para este projeto OpenAI. Não foi usado outro modelo.',
        503,
      );
    if (error.status === 429)
      return new AiError(
        'provider_limit',
        'A OpenAI limitou as chamadas temporariamente. Aguarde antes de enviar outra mensagem.',
        429,
      );
  }
  return new AiError(
    'unavailable',
    'Não foi possível consultar a IA. A tentativa foi consumida e não será repetida automaticamente. As telas manuais continuam disponíveis.',
    503,
  );
}
