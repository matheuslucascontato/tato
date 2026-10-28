import Link from 'next/link';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link className="brand" href="/entrar">
          tato<span className="brand-dot">.</span>
        </Link>
        <div>
          <h1>Mais clareza para cuidar do seu dinheiro.</h1>
          <p>
            Um lugar para entender o que entra, o que sai e o que vem pela frente. No seu ritmo, sem
            julgamentos.
          </p>
          <div className="story-art" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
        <p className="story-footer">UM CUIDADO DE CADA VEZ.</p>
      </section>
      <section className="auth-content">
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
