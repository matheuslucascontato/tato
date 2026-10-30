import { getData } from '@/lib/data';
import { todaySP } from '@/lib/finance/dates';
import { DashboardView } from '@/components/dashboard-view';
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const data = await getData();
  const q = await searchParams;
  const today = todaySP();
  const month =
    q.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month) && q.month >= '1900-01'
      ? q.month
      : today.slice(0, 7);
  return <DashboardView data={data} today={today} month={month} />;
}
