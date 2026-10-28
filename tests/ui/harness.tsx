// Explicit fixtures isolated from Auth, Supabase and OpenAI; not an application route.
import { createRoot } from 'react-dom/client';
import { Chat } from '@/components/ai/chat';
import { Navigation } from '@/components/navigation';
import '@/app/globals.css';
const accounts = [{ id: '50000000-0000-4000-8000-000000000001', name: 'Carteira de TESTE' }];
const categories = [
  {
    id: '50000000-0000-4000-8000-000000000002',
    name: 'Alimentação de TESTE',
    kind: 'expense' as const,
  },
];
createRoot(document.getElementById('root')!).render(
  <div className="app-shell">
    <aside className="sidebar">
      <span className="brand">tato.</span>
      <Navigation />
    </aside>
    <div className="main-column">
      <main className="page-content">
        <p className="notice warning">
          UI isolada de TESTES — dados fictícios; sem conexão ao banco ou à OpenAI.
        </p>
        <h1>Conversar com o Tato</h1>
        <Chat accounts={accounts} categories={categories} />
      </main>
    </div>
    <Navigation mobile />
  </div>,
);
