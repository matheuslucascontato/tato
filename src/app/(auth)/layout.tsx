import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Brand, Mascot } from '@/components/brand/tato';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link className="brand" href="/entrar">
          <Brand />
        </Link>
        <div className="auth-promise">
          <span className="eyebrow">UM CUIDADO DE CADA VEZ</span>
          <h1>
            Seu dinheiro,
            <br />
            <em>com mais jeito.</em>
          </h1>
          <p>
            Saiba o que cabe hoje,
            <br />
            sem apertar o amanhã.
          </p>
          <div className="auth-mascot-stage">
            <div className="shell-arc" aria-hidden="true" />
            <Mascot size={350} />
            <span className="story-chip">
              <ArrowUpRight size={17} /> Clareza para os próximos passos
            </span>
          </div>
        </div>
        <p className="story-footer">
          <ShieldCheck size={16} /> No seu ritmo. Sem julgamentos.
        </p>
      </section>
      <section className="auth-content">
        <div className="auth-mobile-brand-row">
          <Link className="auth-mobile-brand" href="/entrar">
            <Brand compact />
          </Link>
          <Mascot size={88} />
        </div>
        <div className="auth-card">{children}</div>
        <p className="auth-bottom-note">
          Organize o que entra. Entenda o que sai.
          <br />
          Cuide do que vem pela frente.
        </p>
      </section>
    </main>
  );
}
