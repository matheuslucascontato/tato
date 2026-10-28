import Link from 'next/link';
import { ActionForm } from '@/components/action-form';
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = await searchParams;
  return (
    <>
      <span className="auth-label">BEM-VINDO AO TATO</span>
      <h1>Bom ter você por aqui.</h1>
      <p className="muted">Entre para cuidar das suas contas com calma.</p>
      {q.expired && (
        <p className="notice" role="status">
          Entre para continuar. Se a sessão expirou, seus dados continuam salvos.
        </p>
      )}
      {q.authError && (
        <p className="notice error" role="alert">
          O link não pôde ser validado. Ele pode ter expirado ou já ter sido usado. Solicite outro
          link e abra no mesmo navegador.
        </p>
      )}
      <ActionForm auth operation="login" label="Entrar">
        <label>
          E-mail
          <input type="email" name="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Senha
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
      </ActionForm>
      <div className="auth-links">
        <Link href="/recuperar-senha">Esqueci minha senha</Link>
        <Link href="/cadastro">Criar minha conta</Link>
      </div>
    </>
  );
}
