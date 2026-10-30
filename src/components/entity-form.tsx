import Link from 'next/link';
import { notFound } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { getData } from '@/lib/data';
import { todaySP } from '@/lib/finance/dates';
import { idSchema } from '@/lib/validation';
import { PageHeader } from './shell';
import { ActionForm, HiddenId } from './action-form';
import { AccountFields, EntryFields } from './fields';
export async function EntityForm({ section, id }: { section: string; id?: string }) {
  if (
    !['contas', 'lancamentos', 'compromissos', 'categorias'].includes(section) ||
    (id && !idSchema.safeParse(id).success)
  )
    notFound();
  const data = await getData();
  const today = todaySP();
  const editing = !!id;
  const recordId = id || randomUUID();
  const account = data.accounts.find((a) => a.id === id);
  const transaction = data.transactions.find((t) => t.id === id);
  const commitment = data.commitments.find((c) => c.id === id);
  const category = data.categories.find((c) => c.id === id);
  const record =
    section === 'contas'
      ? account
      : section === 'lancamentos'
        ? transaction
        : section === 'compromissos'
          ? commitment
          : category;
  if (editing && !record) notFound();
  const noun =
    section === 'contas'
      ? 'conta'
      : section === 'lancamentos'
        ? 'lançamento'
        : section === 'compromissos'
          ? 'compromisso'
          : 'categoria';
  const operation =
    section === 'contas'
      ? 'account'
      : section === 'lancamentos'
        ? 'transaction'
        : section === 'compromissos'
          ? 'commitment'
          : 'category';
  if (transaction?.commitment_id || commitment?.status === 'settled') {
    const cid = transaction?.commitment_id || id;
    return (
      <>
        <PageHeader
          title="Este lançamento tem um compromisso vinculado"
          description="Para corrigir os dados, estorne a liquidação primeiro. O compromisso será reaberto e o lançamento removido em uma única operação."
        />
        <Link className="btn primary" href={`/compromissos/${cid}/estornar`}>
          Estornar liquidação
        </Link>
      </>
    );
  }
  if (commitment?.status === 'cancelled')
    return (
      <>
        <PageHeader title="Este compromisso foi cancelado" />
        <Link href="/compromissos" className="btn secondary">
          Voltar aos compromissos
        </Link>
      </>
    );
  const noAccounts =
    section === 'lancamentos' && !data.accounts.some((a) => !a.archived) && !editing;
  return (
    <>
      <Link className="back-link" href={`/${section}`}>
        ← Voltar
      </Link>
      <PageHeader
        eyebrow={editing ? 'AJUSTE COM TRANQUILIDADE' : 'UM NOVO REGISTRO'}
        title={`${editing ? 'Editar' : section === 'contas' || section === 'categorias' ? 'Nova' : 'Novo'} ${noun}`}
        description={
          section === 'contas' ? 'Uma conta manual, com valores informados por você.' : undefined
        }
      />
      <section className="panel form-card">
        {noAccounts ? (
          <>
            <p className="notice warning">Crie ou reative uma conta para adicionar lançamentos.</p>
            <Link href="/contas" className="btn primary">
              Gerenciar contas
            </Link>
          </>
        ) : (
          <ActionForm
            operation={`${operation}-${editing ? 'edit' : 'create'}`}
            label={editing ? 'Salvar alterações' : `Adicionar ${noun}`}
          >
            <HiddenId id={recordId} />
            {section === 'contas' ? (
              <AccountFields
                account={account}
                today={today}
                locked={!!account && data.transactions.some((t) => t.account_id === account.id)}
              />
            ) : section === 'categorias' ? (
              <>
                <label>
                  Nome da categoria
                  <input name="name" required maxLength={120} defaultValue={category?.name} />
                </label>
                <label>
                  Tipo
                  <select name="kind" defaultValue={category?.kind || 'expense'}>
                    <option value="expense">Despesas</option>
                    <option value="income">Receitas</option>
                  </select>
                </label>
              </>
            ) : (
              <EntryFields
                accounts={data.accounts}
                categories={data.categories}
                today={today}
                featured={section === 'lancamentos'}
                future={section === 'compromissos'}
                entry={section === 'compromissos' ? commitment : transaction}
              />
            )}
          </ActionForm>
        )}
        <p className="form-footer">
          <Link href={`/${section}`}>Cancelar e voltar</Link>
        </p>
      </section>
    </>
  );
}
