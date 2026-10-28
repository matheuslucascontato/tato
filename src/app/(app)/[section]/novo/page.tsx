import { EntityForm } from '@/components/entity-form';
export default async function New({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  return <EntityForm section={section} />;
}
