import { getData } from '@/lib/data';
import { PageHeader } from '@/components/shell';
import { Chat } from '@/components/ai/chat';
export default async function Conversation() {
  const data = await getData();
  const unavailable =
    process.env.TATO_AI_ENABLED === 'false'
      ? 'Novas mensagens de IA estão pausadas. O controle manual continua disponível.'
      : !process.env.OPENAI_API_KEY
        ? 'IA ainda não configurada: falta OPENAI_API_KEY no servidor. O controle manual continua disponível.'
        : undefined;
  return (
    <>
      <PageHeader
        title="Conversar com o Tato"
        description="Pergunte sobre seus registros ou prepare uma receita ou despesa para revisar."
      />
      <Chat
        unavailable={unavailable}
        accounts={data.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name }))}
        categories={data.categories.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
      />
    </>
  );
}
