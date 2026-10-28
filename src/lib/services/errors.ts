import { z } from 'zod';
export function friendlyError(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message || 'Confira os campos.';
  const e = error as { code?: string; message?: string };
  if (['42P01', 'PGRST205', 'PGRST202', '42501'].includes(e.code || ''))
    return 'Configuração do banco pendente: verifique migrações, grants e a exposição do schema public na Data API. Nenhum dado foi salvo.';
  if (e.code === '23503')
    return 'A conta ou categoria não está disponível, ou o tipo da categoria não corresponde ao lançamento.';
  if (e.code === '23505')
    return 'Este registro já existe. Recarregue a página antes de tentar novamente.';
  if (e.code === '23514') return 'Confira os valores e datas informados.';
  if (e.code === 'P0001') return e.message || 'Não foi possível concluir a operação.';
  if (e.code === 'invalid_credentials') return 'E-mail ou senha não conferem.';
  if (e.code === 'email_not_confirmed') return 'Confirme seu e-mail para entrar.';
  if (e.code === 'over_email_send_rate_limit' || e.code === 'over_request_rate_limit')
    return 'O limite de tentativas foi atingido. Aguarde um pouco antes de tentar novamente.';
  if (e.code === 'same_password') return 'Escolha uma senha diferente da atual.';
  if (e.code === 'weak_password')
    return 'Escolha uma senha mais forte, com letras, números e símbolos.';
  if (e.message?.includes('Configura') || e.message?.startsWith('Configure ')) return e.message;
  if (
    error instanceof Error &&
    !e.code &&
    !/fetch|network|JWT|token|JSON|cookie|supabase|http/i.test(error.message)
  )
    return error.message;
  return 'Não foi possível concluir. Confira sua conexão e a configuração do Supabase e tente novamente.';
}
