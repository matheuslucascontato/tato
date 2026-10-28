'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CalendarDays,
  Tags,
  MessageCircle,
} from 'lucide-react';
const links = [
  { href: '/painel', label: 'Visão geral', short: 'Início', icon: LayoutDashboard },
  { href: '/lancamentos', label: 'Lançamentos', short: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/compromissos', label: 'Compromissos', short: 'Compromissos', icon: CalendarDays },
  { href: '/conversar', label: 'Conversar com o Tato', short: 'Conversar', icon: MessageCircle },
  { href: '/contas', label: 'Contas', short: 'Contas', icon: Wallet },
  { href: '/categorias', label: 'Categorias', short: 'Categorias', icon: Tags },
];
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label={mobile ? 'Principal no celular' : 'Principal'}
      className={mobile ? 'bottom-nav' : 'desktop-nav'}
    >
      {links
        .filter((_, i) => !mobile || i < 5)
        .map(({ href, label, short, icon: Icon }) => (
          <Link
            href={href}
            key={href}
            aria-current={path === href || path.startsWith(href + '/') ? 'page' : undefined}
          >
            <Icon size={mobile ? 21 : 20} />
            <span>{mobile ? short : label}</span>
          </Link>
        ))}
    </nav>
  );
}
