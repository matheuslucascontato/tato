import 'server-only';
import type { DB } from '@/lib/services/repository';
import { mutateFinance } from '@/lib/services/finance';
import type { Snapshot } from '@/lib/types';
import { todaySP } from '@/lib/finance/dates';
import { validateContent } from './preparation';
import { readProposal, seal } from './tokens';
import { AiError } from './errors';
import type { ChatResult, ProposalContent, ProposalState, ProposalView } from './types';
export async function prepareProposal(
  db: DB,
  user: string,
  id: string,
  version: number,
  content: ProposalContent,
  data: Snapshot,
): Promise<ProposalView> {
  const valid = validateContent(content, data, todaySP());
  const { data: state, error } = await db.rpc('prepare_tato_ai_proposal', {
    p_id: id,
    p_version: version,
    p_content: valid,
  });
  if (error) throw error;
  if (!state || state.user_id !== user || state.id !== id)
    throw new AiError('ownership', 'Não foi possível conferir a proposta.');
  return {
    id: state.id,
    version: state.version,
    expires_at: state.expires_at,
    content: valid,
    account_name: data.accounts.find((a) => a.id === valid.account_id)!.name,
    category_name: data.categories.find((a) => a.id === valid.category_id)!.name,
    token: seal('proposal', {
      user,
      id: state.id,
      version: state.version,
      expires: new Date(state.expires_at).getTime(),
      content: valid,
    }),
  };
}
export async function proposalState(db: DB, user: string, id: string): Promise<ProposalState> {
  const { data, error } = await db
    .from('ai_proposals')
    .select('*')
    .eq('user_id', user)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AiError('not_found', 'Proposta não encontrada para esta sessão.', 404);
  return data;
}
export async function recoverConfirmed(db: DB, user: string, id: string): Promise<ChatResult> {
  const state = await proposalState(db, user, id);
  if (state.status !== 'confirmed') {
    const ended =
      state.status === 'cancelled' || new Date(state.expires_at).getTime() <= Date.now();
    return {
      message: ended
        ? 'A proposta foi cancelada ou expirou. Nenhum lançamento foi criado por esta proposta.'
        : 'Ainda não há confirmação gravada. Se o card não chegou, encerre a tentativa e descreva novamente. Esta consulta não repete a chamada à IA.',
    };
  }
  const { data, error } = await db
    .from('transactions')
    .select('id,occurred_on')
    .eq('user_id', user)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new AiError(
      'removed',
      'O lançamento foi confirmado e depois removido manualmente. Ele não será recriado.',
      409,
    );
  return {
    message: 'Confirmação conferida no banco. O lançamento está na sua lista.',
    transaction_id: id,
    href: `/lancamentos?from=${data.occurred_on}&to=${data.occurred_on}&destaque=${id}#lancamento-${id}`,
  };
}
export async function confirmProposal(
  db: DB,
  user: string,
  id: string,
  version: number,
  token: string,
): Promise<ChatResult> {
  const state = await proposalState(db, user, id);
  // Recover success even after token expiry/key rotation/response loss. Never reinsert.
  if (state.status === 'confirmed') return recoverConfirmed(db, user, id);
  if (state.version !== version || state.status !== 'pending')
    throw new AiError('changed', 'Esta proposta mudou ou foi cancelada. Revise novamente.', 409);
  const content = readProposal(token, user, id, version);
  const form = new FormData();
  form.set('id', id);
  form.set('version', String(version));
  form.set('content', JSON.stringify(content));
  await mutateFinance(db, user, 'ai-confirm', form);
  return recoverConfirmed(db, user, id);
}
