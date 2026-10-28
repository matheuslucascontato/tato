import { requireUser } from '@/lib/supabase/server';
import { ActionForm } from '@/components/action-form';
export default async function Reset() {
  await requireUser();
  return (
    <>
      <h1>Escolha sua nova senha</h1>
      <p className="muted">Uma nova senha para continuar com suas informações protegidas.</p>
      <ActionForm auth operation="reset" label="Salvar nova senha">
        <label>
          Nova senha
          <input
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />
        </label>
      </ActionForm>
    </>
  );
}
