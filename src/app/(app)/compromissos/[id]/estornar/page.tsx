import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getData } from '@/lib/data';
import { money } from '@/lib/finance/money';
import { PageHeader } from '@/components/shell';
import { ActionForm, HiddenId } from '@/components/action-form';
export default async function Reverse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getData();
  const c = data.commitments.find((c) => c.id === id);
  if (!c) notFound();
  return (
    <>
      <Link href="/compromissos" className="back-link">
        ← Voltar
      </Link>
      <PageHeader
        title="Estornar liquidação"
        description={`${c.description} · ${money(c.amount_cents)}`}
      />
      <section className="panel form-card">
        {c.status === 'settled' ? (
          <>
            <p>
              O lançamento vinculado será removido e o compromisso voltará a ficar pendente. O saldo
              e a previsão serão recalculados juntos.
            </p>
            <p className="notice warning">
              Use esta ação para corrigir uma quitação registrada no Tato. Ela não movimenta
              dinheiro no banco.
            </p>
            <ActionForm
              operation="reverse"
              label="Confirmar estorno e reabrir"
              destructive
              confirm="Estornar esta liquidação e reabrir o compromisso? O lançamento vinculado será removido."
            >
              <HiddenId id={c.id} />
            </ActionForm>
          </>
        ) : (
          <p className="notice">Este compromisso não tem uma liquidação para estornar.</p>
        )}
      </section>
    </>
  );
}
