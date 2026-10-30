'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, requireUser } from '@/lib/supabase/server';
import { siteURL } from '@/lib/supabase/config';
import { emailSchema, passwordSchema } from '@/lib/validation';
import { friendlyError } from '@/lib/services/errors';
import { mutateFinance } from '@/lib/services/finance';
export type ActionState = {
  error?: string;
  success?: string;
  destination?: string;
  recordId?: string;
};
export async function authAction(
  operation: string,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  let destination = '';
  try {
    const db = await createClient();
    if (operation === 'logout') {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      destination = '/entrar';
    } else if (operation === 'reset') {
      await requireUser();
      const password = passwordSchema.parse(form.get('password'));
      const { error } = await db.auth.updateUser({ password });
      if (error) throw error;
      destination = '/painel?success=1';
    } else {
      const email = emailSchema.parse(String(form.get('email') || '').trim());
      if (operation === 'recover') {
        const { error } = await db.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteURL()}/auth/callback?next=/redefinir-senha`,
        });
        if (error) throw error;
        return {
          success:
            'Solicitação aceita. Se houver uma conta para este e-mail, procure as instruções de recuperação e confira também o spam.',
        };
      }
      const password =
        operation === 'signup'
          ? passwordSchema.parse(form.get('password'))
          : String(form.get('password') || '');
      if (operation === 'signup') {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${siteURL()}/auth/callback` },
        });
        if (error) throw error;
        if (!data.session)
          return {
            success:
              'Cadastro solicitado. Se o endereço estiver disponível, você receberá um link para confirmar seu e-mail antes de entrar.',
          };
        destination = '/configuracao';
      } else if (operation === 'login') {
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        destination = '/painel';
      } else throw new Error('Operação inválida.');
    }
  } catch (error) {
    return { error: friendlyError(error) };
  }
  revalidatePath('/', 'layout');
  redirect(destination);
}
const destinations: Record<string, string> = {
  onboard: '/painel',
  profile: '/contas',
  'account-create': '/contas',
  'account-edit': '/contas',
  'account-archive': '/contas',
  'account-restore': '/contas',
  'category-create': '/categorias',
  'category-edit': '/categorias',
  'transaction-create': '/lancamentos',
  'transaction-edit': '/lancamentos',
  'transaction-delete': '/lancamentos',
  'commitment-create': '/compromissos',
  'commitment-edit': '/compromissos',
  'commitment-cancel': '/compromissos',
  settle: '/compromissos',
  reverse: '/compromissos',
};
export async function financeAction(
  operation: string,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await requireUser();
  if (!(operation in destinations)) return { error: 'Operação indisponível neste formulário.' };
  try {
    await mutateFinance(db, user.id, operation, form);
  } catch (error) {
    return { error: friendlyError(error) };
  }
  revalidatePath('/', 'layout');
  redirect(`${destinations[operation] || '/painel'}?success=1`);
}

/** Returns only after the authenticated service has completed. UI owns navigation/feedback. */
export async function saveFinanceAction(
  operation: string,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await requireUser();
  if (!Object.hasOwn(destinations, operation))
    return { error: 'Operação indisponível neste formulário.' };
  try {
    await mutateFinance(db, user.id, operation, form);
  } catch (error) {
    return { error: friendlyError(error) };
  }
  revalidatePath('/', 'layout');
  const messages: Record<string, string> = {
    'transaction-create': 'Lançamento registrado. Seus totais foram atualizados.',
    'account-create': 'Conta manual cadastrada.',
    onboard: 'Seu ponto de partida está pronto.',
    settle: 'Compromisso liquidado e lançamento conferido.',
    reverse: 'Liquidação estornada. O compromisso está pendente novamente.',
  };
  return {
    success: messages[operation] || 'Alterações salvas.',
    destination: destinations[operation],
    recordId: String(form.get('id') || ''),
  };
}
