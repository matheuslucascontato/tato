import Link from 'next/link';
import { Brand, Mascot } from '@/components/brand/tato';
export default function NotFound() {
  return (
    <main className="error-page">
      <Brand />
      <div className="error-illustration">
        <Mascot expression="atento" size={130} />
      </div>
      <h1>Não encontramos esse registro</h1>
      <p>Ele pode ter sido removido ou não estar disponível para sua conta.</p>
      <Link href="/painel" className="btn primary">
        Voltar ao início
      </Link>
    </main>
  );
}
