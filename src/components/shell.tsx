import Link from 'next/link';
import { Plus, LogOut } from 'lucide-react';
import { Navigation } from './navigation';
import { ActionForm } from './action-form';
export function Shell({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <div className="app-shell">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link className="brand" href="/painel">
          tato<span className="brand-dot">.</span>
        </Link>
        <p className="brand-caption">Um cuidado de cada vez.</p>
        <Navigation />
        <div className="sidebar-bottom">
          <div className="small-note">
            Mais clareza para cuidar
            <br />
            do seu dinheiro.
          </div>
          <p className="user-name">{name}</p>
          <ActionForm operation="logout" auth label="Sair" className="logout-form">
            <LogOut size={16} aria-hidden="true" />
          </ActionForm>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <Link className="brand mobile-brand" href="/painel">
            tato<span className="brand-dot">.</span>
          </Link>
          <span className="topbar-note">Sua vida financeira, com mais clareza</span>
          <Link href="/lancamentos/novo" className="btn primary add-button">
            <Plus size={18} />
            <span>Adicionar lançamento</span>
          </Link>
        </header>
        <main id="conteudo" className="page-content">
          {children}
        </main>
        <footer className="app-footer">
          Feito para acompanhar o seu ritmo. Valores informados por você.
        </footer>
      </div>
      <Navigation mobile />
    </div>
  );
}
export function PageHeader({
  eyebrow = 'SEU DINHEIRO, MAIS PERTO',
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title,
  children,
  href,
  label,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol" aria-hidden="true">
        ＋
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {href && (
        <Link href={href} className="btn secondary">
          {label || 'Começar'}
        </Link>
      )}
    </div>
  );
}
