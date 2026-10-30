import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const m = vi.hoisted(() => ({ requireUser: vi.fn(), mutate: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ requireUser: m.requireUser, createClient: vi.fn() }));
vi.mock('@/lib/services/finance', () => ({ mutateFinance: m.mutate }));
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
import { saveFinanceAction } from '@/app/actions';
const uid = '70000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.clearAllMocks();
  m.requireUser.mockResolvedValue({ user: { id: uid }, db: { authenticated: true } });
  m.mutate.mockResolvedValue(undefined);
});
describe('registro rápido: adaptador autenticado reutiliza o serviço financeiro', () => {
  it('espera a gravação antes de emitir sucesso/atualizar, com proprietário da sessão', async () => {
    let resolve: () => void = () => {};
    m.mutate.mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    const form = new FormData();
    form.set('id', uid);
    form.set('user_id', 'owner-forged');
    const result = saveFinanceAction('transaction-create', {}, form);
    await Promise.resolve();
    expect(m.revalidate).not.toHaveBeenCalled();
    resolve();
    const state = await result;
    expect(m.mutate).toHaveBeenCalledWith({ authenticated: true }, uid, 'transaction-create', form);
    expect(state).toMatchObject({
      success: expect.any(String),
      recordId: uid,
      destination: '/lancamentos',
    });
    expect(m.revalidate).toHaveBeenCalledWith('/', 'layout');
  });
  it('não informa sucesso nem invalida totais ao falhar', async () => {
    m.mutate.mockRejectedValue(new Error('Data anterior à referência.'));
    const state = await saveFinanceAction('transaction-create', {}, new FormData());
    expect(state.error).toContain('referência');
    expect(state.success).toBeUndefined();
    expect(m.revalidate).not.toHaveBeenCalled();
  });
  it('sessão expirada não chega ao serviço e não pode confirmar IA por este adaptador', async () => {
    m.requireUser.mockRejectedValue(new Error('Sessão expirada'));
    await expect(saveFinanceAction('transaction-create', {}, new FormData())).rejects.toThrow(
      'Sessão',
    );
    expect(m.mutate).not.toHaveBeenCalled();
    m.requireUser.mockResolvedValue({ user: { id: uid }, db: {} });
    expect((await saveFinanceAction('ai-confirm', {}, new FormData())).error).toBeTruthy();
    expect(m.mutate).not.toHaveBeenCalled();
  });
});
