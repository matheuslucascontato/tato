import { AiError } from './errors';
export function verifyOrigin(request: Request, trustedOrigin: string) {
  if (
    request.headers.get('origin') !== trustedOrigin ||
    ['cross-site', 'none'].includes(request.headers.get('sec-fetch-site') || '')
  )
    throw new AiError(
      'origin',
      'Origem não autorizada. Abra a conversa pelo próprio Tato e tente novamente.',
      403,
    );
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new AiError('content_type', 'Envie uma requisição JSON válida.', 415);
}
export async function boundedJSON(request: Request): Promise<unknown> {
  if (Number(request.headers.get('content-length') || 0) > 20000)
    throw new AiError('size', 'A mensagem excedeu o limite.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AiError('body', 'Requisição vazia.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 20000) {
      await reader.cancel();
      throw new AiError('size', 'A mensagem excedeu o limite.', 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new AiError('body', 'Requisição inválida.');
  }
}
