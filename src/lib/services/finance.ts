import 'server-only';
import type { DB } from './repository';
import { insertOnce } from './repository';
import {
  accountSchema,
  entrySchema,
  commitmentSchema,
  categorySchema,
  idSchema,
  realizedSchema,
  textSchema,
} from '@/lib/validation';
import { assertRealizedDate } from '@/lib/finance/calculations';
import { todaySP } from '@/lib/finance/dates';
/** Entry point shared by server actions and future authenticated adapters. Never accepts an owner from a form. */
export async function mutateFinance(db: DB, userId: string, operation: string, form: FormData) {
  const values = Object.fromEntries(form);
  const id = () => idSchema.parse(values.id);
  if (operation === 'onboard') {
    const account = accountSchema.parse(values);
    const { error } = await db.rpc('initialize_tato', {
      p_name: textSchema.parse(values.display_name),
      p_account_name: account.name,
      p_balance: account.initial_balance_cents,
      p_reference: account.reference_date,
    });
    if (error) throw error;
    return;
  }
  if (operation === 'profile') {
    const { error } = await db
      .from('profiles')
      .update({ display_name: textSchema.parse(values.display_name) })
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }
  if (operation === 'account-create') {
    await insertOnce(db, {
      table: 'accounts',
      row: { ...accountSchema.parse(values), id: id(), user_id: userId },
    });
    return;
  }
  if (operation === 'account-edit') {
    const { error } = await db
      .from('accounts')
      .update(accountSchema.parse(values))
      .eq('user_id', userId)
      .eq('id', id())
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'account-archive' || operation === 'account-restore') {
    const { error } = await db
      .from('accounts')
      .update({ archived: operation === 'account-archive' })
      .eq('user_id', userId)
      .eq('id', id())
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'category-create') {
    const { error } = await db
      .from('categories')
      .insert({ ...categorySchema.parse(values), user_id: userId });
    if (error) throw error;
    return;
  }
  if (operation === 'category-edit') {
    const { error } = await db
      .from('categories')
      .update(categorySchema.parse(values))
      .eq('user_id', userId)
      .eq('id', id())
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'ai-confirm') {
    // The authenticated adapter supplies a signed, reviewed proposal. SQL locks
    // its version and commits the movement + confirmation atomically. Same ID on retries.
    const { contentSchema } = await import('@/lib/ai/types');
    const content = contentSchema.parse(JSON.parse(String(values.content)));
    const version = Number(values.version);
    if (!Number.isSafeInteger(version) || version < 1) throw new Error('Versão inválida.');
    const { data, error } = await db.rpc('confirm_tato_ai_proposal', {
      p_id: id(),
      p_version: version,
      p_content: content,
    });
    if (error) throw error;
    return data;
  }
  if (operation === 'transaction-create' || operation === 'transaction-edit') {
    const input = entrySchema.parse(values);
    const { data: account, error: accountError } = await db
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('id', input.account_id)
      .single();
    if (accountError) throw accountError;
    assertRealizedDate(input.occurred_on, account.reference_date, todaySP());
    if (operation === 'transaction-create')
      await insertOnce(db, { table: 'transactions', row: { ...input, id: id(), user_id: userId } });
    else {
      const { error } = await db
        .from('transactions')
        .update(input)
        .eq('id', id())
        .eq('user_id', userId)
        .is('commitment_id', null)
        .select('id')
        .single();
      if (error) throw error;
    }
    return;
  }
  if (operation === 'transaction-delete') {
    const { error } = await db
      .from('transactions')
      .delete()
      .eq('id', id())
      .eq('user_id', userId)
      .is('commitment_id', null)
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'commitment-create') {
    await insertOnce(db, {
      table: 'commitments',
      row: { ...commitmentSchema.parse(values), id: id(), user_id: userId },
    });
    return;
  }
  if (operation === 'commitment-edit') {
    const { error } = await db
      .from('commitments')
      .update(commitmentSchema.parse(values))
      .eq('id', id())
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'commitment-cancel') {
    const { error } = await db
      .from('commitments')
      .update({ status: 'cancelled' })
      .eq('id', id())
      .eq('user_id', userId)
      .eq('status', 'pending')
      .select('id')
      .single();
    if (error) throw error;
    return;
  }
  if (operation === 'settle') {
    const { error } = await db.rpc('settle_commitment', {
      p_id: id(),
      p_account_id: idSchema.parse(values.account_id),
      p_occurred_on: realizedSchema.parse(values.occurred_on),
    });
    if (error) throw error;
    return;
  }
  if (operation === 'reverse') {
    const { error } = await db.rpc('reverse_settlement', { p_id: id() });
    if (error) throw error;
    return;
  }
  throw new Error('Operação inválida.');
}
