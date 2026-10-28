import { EntityForm } from '@/components/entity-form';
export default async function Edit({
  params,
}: {
  params: Promise<{ section: string; id: string }>;
}) {
  const { section, id } = await params;
  return <EntityForm section={section} id={id} />;
}
