import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'Tato · Mais clareza para cuidar do seu dinheiro', template: '%s · Tato' },
  description:
    'Organize suas contas, receitas, despesas e compromissos com mais clareza e sem julgamento.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
