import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { siteURL } from '@/lib/supabase/config';
import { snapshot } from '@/lib/services/repository';
import { friendlyError } from '@/lib/services/errors';
import { commandSchema } from '@/lib/ai/types';
import { AiError } from '@/lib/ai/errors';
import { verifyOrigin, boundedJSON } from '@/lib/ai/http';
import { interpretMessage } from '@/lib/ai/interpretation';
import {
  confirmProposal,
  prepareProposal,
  proposalState,
  recoverConfirmed,
} from '@/lib/ai/proposals';
import { readProposal } from '@/lib/ai/tokens';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    // Authenticated cookies and exact trusted origin apply even to direct HTTP.
    verifyOrigin(request, siteURL());
    const db = await createClient();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user)
      throw new AiError('session', 'Sua sessão expirou. Entre novamente para continuar.', 401);
    const command = commandSchema.parse(await boundedJSON(request));
    let result;
    if (command.action === 'message') {
      const data = await snapshot(db, user.id);
      if (!data.profile)
        throw new AiError('onboarding', 'Conclua a configuração inicial antes de conversar.');
      result = await interpretMessage(
        db,
        user.id,
        command.request_id,
        command.message,
        command.context,
        data,
      );
    } else if (command.action === 'confirm') {
      result = await confirmProposal(db, user.id, command.id, command.version, command.token);
    } else if (command.action === 'recover') {
      result = await recoverConfirmed(db, user.id, command.id);
    } else if (command.action === 'cancel') {
      const { error } = await db.rpc('cancel_tato_ai_proposal', {
        p_id: command.id,
        p_version: command.version,
      });
      if (error) throw error;
      result = { message: 'Proposta cancelada. Nenhum lançamento foi criado.' };
    } else {
      // Require the old signed version; corrections always produce a new review.
      readProposal(command.token, user.id, command.id, command.version);
      const state = await proposalState(db, user.id, command.id);
      if (state.status !== 'pending')
        throw new AiError('changed', 'A proposta já foi encerrada.', 409);
      const data = await snapshot(db, user.id);
      result = {
        message: 'Proposta corrigida. Revise a nova versão antes de confirmar.',
        proposal: await prepareProposal(
          db,
          user.id,
          command.id,
          command.version,
          command.content,
          data,
        ),
      };
    }
    if ('transaction_id' in result && result.transaction_id) {
      revalidatePath('/painel');
      revalidatePath('/lancamentos');
      revalidatePath('/contas');
    }
    return Response.json(result, { headers });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof AiError ? error.message : friendlyError(error),
        code: error instanceof AiError ? error.code : 'validation',
      },
      { status: error instanceof AiError ? error.status : 400, headers },
    );
  }
}
