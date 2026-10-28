import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
export default function Recover() {
  return (
    <>
      <h1>Recupere seu acesso</h1>
      <p className="muted">Informe seu e-mail para solicitar um link de redefinição de senha.</p>
      <ActionForm auth operation="recover" label="Solicitar link">
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
      </ActionForm>
      <p className="form-footer">
        <Link href="/entrar">Voltar para entrar</Link>
      </p>
    </>
  );
}
