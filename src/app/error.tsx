'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <p className="brand">
        tato<span className="brand-dot">.</span>
      </p>
      <h1>Vamos tentar de novo?</h1>
      <p>
        Não foi possível carregar esta página. Confira a conexão e as variáveis de ambiente. Se for
        o primeiro acesso, verifique as migrações, os grants e a Data API do Supabase.
      </p>
      <button className="btn primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
