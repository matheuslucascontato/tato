import { redirect } from 'next/navigation';
import { getData } from '@/lib/data';
import { todaySP } from '@/lib/finance/dates';
import { ActionForm } from '@/components/action-form';
import { Brand } from '@/components/brand/tato';
import { SetupForm } from '@/components/setup-form';
export const dynamic = 'force-dynamic';
export default async function Setup() {
  const data = await getData();
  if (data.profile && data.accounts.length && data.categories.length) redirect('/painel');
  return (
    <main className="setup-shell">
      <Brand />
      <SetupForm name={data.profile?.display_name} account={data.accounts[0]} today={todaySP()} />
      <div className="section-space">
        <ActionForm auth operation="logout" label="Sair" className="logout-form" />
      </div>
    </main>
  );
}
