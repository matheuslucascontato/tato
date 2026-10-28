import { redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { Shell } from '@/components/shell';
export const dynamic = 'force-dynamic';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const data = await getData();
  if (!data.profile || !data.accounts.length || !data.categories.length) redirect('/configuracao');
  return <Shell name={data.profile.display_name}>{children}</Shell>;
}
