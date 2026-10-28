import Link from 'next/link';
import { getData } from '@/lib/data';
import { PageHeader } from '@/components/shell';
export default async function Categories({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  return (
    <>
      <PageHeader
        title="Categorias"
        description="Um jeito simples de entender para onde seu dinheiro vai."
        action={
          <Link href="/categorias/novo" className="btn secondary">
            + Nova categoria
          </Link>
        }
      />
      {q.success && (
        <p className="notice success" role="status">
          Categoria salva.
        </p>
      )}
      {(['income', 'expense'] as const).map((kind) => (
        <section key={kind} className="panel section-space">
          <h2>{kind === 'income' ? 'Receitas' : 'Despesas'}</h2>
          <div className="category-list">
            {data.categories
              .filter((c) => c.kind === kind)
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map((c) => (
                <Link className="category-chip" href={`/categorias/${c.id}/editar`} key={c.id}>
                  {c.name} <span aria-label="editar">↗</span>
                </Link>
              ))}
          </div>
        </section>
      ))}
      <p className="field-help section-space">
        Categorias pertencem à sua conta. O tipo não pode mudar se a categoria já estiver em uso.
      </p>
    </>
  );
}
