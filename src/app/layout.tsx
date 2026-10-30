import type { Metadata } from 'next';
import './globals.css';
import './redesign.css';
import { AppUI } from '@/components/ui/app-ui';
export const metadata: Metadata = {
  title: { default: 'Tato · Seu dinheiro, com mais jeito.', template: '%s · Tato' },
  description:
    'Organize suas contas, receitas, despesas e compromissos com mais clareza e sem julgamento.',
  icons: { icon: '/brand/tato/favicon.png', apple: '/brand/tato/app-icon.png' },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppUI>{children}</AppUI>
      </body>
    </html>
  );
}
