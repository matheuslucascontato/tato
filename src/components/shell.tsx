import Link from 'next/link';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Navigation } from './navigation';
import { ActionForm } from './action-form';
import { Brand } from './brand/tato';
import { QuickEntryProvider, QuickEntryButton } from './quick-entry';
import type { Account, Category } from '@/lib/types';
export function Shell({
  children,
  name,
  accounts,
  categories,
  today,
}: {
  children: React.ReactNode;
  name: string;
  accounts: Account[];
  categories: Category[];
  today: string;
}) {
  return (
    <QuickEntryProvider accounts={accounts} categories={categories} today={today}>
      <div className="app-shell">
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <aside className="sidebar">
          <Link className="brand" href="/painel">
            <Brand />
          </Link>
          <p className="brand-caption">Seu dinheiro, com mais jeito.</p>
          <Navigation />
          <div className="sidebar-bottom">
            <div className="small-note">
              Saiba o que cabe hoje,
              <br />
              sem apertar o amanhã.
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
              <Brand />
            </Link>
            <span className="topbar-note">
              <span className="rhythm-dot" aria-hidden="true" /> Suas finanças, no seu ritmo
            </span>
            <QuickEntryButton className="btn primary add-button" />
          </header>
          <main id="conteudo" className="page-content">
            {children}
          </main>
          <footer className="app-footer">
            <ShieldCheck size={14} aria-hidden="true" /> Contas manuais. Dados informados por você.
            Um cuidado de cada vez.
          </footer>
        </div>
        <Navigation mobile />
      </div>
    </QuickEntryProvider>
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
