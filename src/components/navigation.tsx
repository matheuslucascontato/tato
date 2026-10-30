'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  House,
  Wallet,
  ArrowUpDown,
  CalendarDays,
  Tags,
  MessageCircle,
  Ellipsis,
} from 'lucide-react';
const destinations = [
  { href: '/painel', label: 'Início', short: 'Início', icon: House },
  { href: '/lancamentos', label: 'Lançamentos', short: 'Lançamentos', icon: ArrowUpDown },
  { href: '/compromissos', label: 'Planejamento', short: 'Planejar', icon: CalendarDays },
  { href: '/conversar', label: 'Conversar com o Tato', short: 'Tato', icon: MessageCircle },
  { href: '/contas', label: 'Minhas contas', short: 'Contas', icon: Wallet },
  { href: '/categorias', label: 'Categorias', short: 'Categorias', icon: Tags },
  { href: '/mais', label: 'Mais e preferências', short: 'Mais', icon: Ellipsis },
];
export function Navigation({ mobile = false }: { mobile?: boolean }) {
  const path = usePathname();
  const links = mobile ? [...destinations.slice(0, 4), destinations[6]] : destinations;
  return (
    <nav
      aria-label={mobile ? 'Principal no celular' : 'Principal'}
      className={mobile ? 'bottom-nav' : 'desktop-nav'}
    >
      {links.map(({ href, label, short, icon: Icon }) => {
        const active =
          path === href ||
          path.startsWith(href + '/') ||
          (mobile &&
            href === '/mais' &&
            ['/contas', '/categorias'].some((p) => path.startsWith(p)));
        return (
          <Link href={href} key={href} aria-current={active ? 'page' : undefined}>
            <Icon size={21} aria-hidden="true" />
            <span>{mobile ? short : label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
