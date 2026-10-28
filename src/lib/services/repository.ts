import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Snapshot } from '@/lib/types';
export type DB = SupabaseClient<Database>;
export async function snapshot(db: DB, userId: string): Promise<Snapshot> {
  // One MVCC snapshot: a concurrent settlement cannot split movements and forecasts.
  // The RPC runs with the authenticated context and RLS; it accepts no owner parameter.
  const { data, error } = await db.rpc('get_tato_snapshot', {});
  if (error) throw error;
  if (
    !data ||
    (data.profile && data.profile.user_id !== userId) ||
    [data.accounts, data.categories, data.transactions, data.commitments].some((rows) =>
      rows.some((row) => row.user_id !== userId),
    )
  )
    throw new Error('Não foi possível conferir os registros da sua conta.');
  return data;
}

type NewRow = {
  [K in 'accounts' | 'transactions' | 'commitments']: {
    table: K;
    row: Database['public']['Tables'][K]['Insert'] & { id: string };
  };
}['accounts' | 'transactions' | 'commitments'];
export async function insertOnce(db: DB, entry: NewRow) {
  const { error } =
    entry.table === 'accounts'
      ? await db.from('accounts').insert(entry.row)
      : entry.table === 'transactions'
        ? await db.from('transactions').insert(entry.row)
        : await db.from('commitments').insert(entry.row);
  if (!error) return;
  if (error.code === '23505') {
    const { data: existing, error: readError } = await db
      .from(entry.table)
      .select('*')
      .eq('id', entry.row.id)
      .eq('user_id', entry.row.user_id)
      .maybeSingle();
    if (
      !readError &&
      existing &&
      Object.entries(entry.row).every(
        ([k, v]) => (existing as unknown as Record<string, unknown>)[k] === v,
      )
    )
      return;
  }
  throw error;
}
