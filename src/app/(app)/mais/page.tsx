import Link from 'next/link';
import {
  Wallet,
  Tags,
  CalendarDays,
  MessageCircle,
  ArrowUpRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { PageHeader } from '@/components/shell';
import { Mascot } from '@/components/brand/tato';
import { ActionForm } from '@/components/action-form';
export default function More() {
  return (
    <>
      <PageHeader
        title="Do seu jeito"
        description="Suas contas, suas categorias. Um lugar para cada cuidado."
      />
      <div className="more-grid">
        {[
          {
            href: '/contas',
            title: 'Minhas contas',
            text: 'Cadastre, edite ou arquive contas manuais.',
            icon: Wallet,
          },
          {
            href: '/categorias',
            title: 'Categorias',
            text: 'Organize suas entradas e despesas.',
            icon: Tags,
          },
          {
            href: '/compromissos',
            title: 'Planejamento',
            text: 'O que você espera receber e pagar.',
            icon: CalendarDays,
          },
          {
            href: '/conversar',
            title: 'Conversar com o Tato',
            text: 'Entenda seus registros e revise lançamentos.',
            icon: MessageCircle,
          },
        ].map(({ href, title, text, icon: Icon }) => (
          <Link className="more-link" href={href} key={href}>
            <span className="feature-icon">
              <Icon size={23} />
            </span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
            <ArrowUpRight size={19} />
          </Link>
        ))}
      </div>
      <section className="privacy-note">
        <Mascot expression="confiante" size={100} />
        <div>
          <h2>
            <ShieldCheck size={20} /> Clareza também sobre seus dados
          </h2>
          <p>
            As contas são manuais, sem sincronização bancária. As operações usam sua sessão
            autenticada. Confira os dados antes de confirmar qualquer lançamento.
          </p>
          <ActionForm auth operation="logout" label="Sair da minha conta" className="logout-form">
            <LogOut size={16} />
          </ActionForm>
        </div>
      </section>
    </>
  );
}
