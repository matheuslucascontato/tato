import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
export default function Signup() {
  return (
    <>
      <span className="auth-label">SEU PRIMEIRO PASSO</span>
      <h1>Vamos começar?</h1>
      <p className="muted">Crie sua conta. Depois, organize o dinheiro do seu jeito.</p>
      <ActionForm auth operation="signup" label="Criar conta">
        <label>
          E-mail
          <input type="email" name="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            aria-describedby="password-help"
          />
        </label>
        <p id="password-help" className="field-help">
          Use pelo menos 8 caracteres. Combine letras, números e símbolos.
        </p>
      </ActionForm>
      <p className="form-footer">
        Já tem uma conta? <Link href="/entrar">Entrar</Link>
      </p>
    </>
  );
}
