'use client';
import { Brand, Mascot } from '@/components/brand/tato';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <Brand />
      <div className="error-illustration">
        <Mascot expression="cuidadoso" size={135} />
      </div>
      <h1>Vamos tentar de novo?</h1>
      <p>
        Não conseguimos carregar esta página agora. Confira sua conexão e tente novamente. Se
        continuar, procure quem administra esta versão de teste.
      </p>
      <button className="btn primary" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
