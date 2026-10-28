import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  interpret: vi.fn(),
  confirm: vi.fn(),
  recover: vi.fn(),
  revalidate: vi.fn(),
  snapshot: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('@/lib/ai/interpretation', () => ({ interpretMessage: mocks.interpret }));
vi.mock('@/lib/ai/proposals', () => ({
  confirmProposal: mocks.confirm,
  recoverConfirmed: mocks.recover,
  prepareProposal: vi.fn(),
  proposalState: vi.fn(),
}));
vi.mock('@/lib/services/repository', () => ({ snapshot: mocks.snapshot }));
import { POST } from '@/app/api/tato/route';
const uid = '40000000-0000-4000-8000-000000000001';
function request(body: unknown, origin = 'https://tato.test') {
  return new Request('https://tato.test/api/tato', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://tato.test');
  mocks.getUser.mockResolvedValue({ data: { user: { id: uid } }, error: null });
  mocks.snapshot.mockResolvedValue({ profile: {} });
});
afterEach(() => vi.unstubAllEnvs());
describe('endpoint HTTP: autenticação, fronteira e atualização das telas', () => {
  it.each([null, { id: uid }])(
    'nega sessão ausente/expirada sem chamar modelo (%s)',
    async (user) => {
      mocks.getUser.mockResolvedValue({ data: { user }, error: user ? { code: 'expired' } : null });
      const r = await POST(request({ action: 'message', request_id: uid, message: 'Teste' }));
      expect(r.status).toBe(401);
      expect(mocks.interpret).not.toHaveBeenCalled();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it('recusa origem externa antes de qualquer operação', async () => {
    const r = await POST(request({ action: 'cancel', id: uid, version: 1 }, 'https://evil.test'));
    expect(r.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('não aceita proprietário, histórico ou sistema vindo do navegador', async () => {
    const r = await POST(
      request({
        action: 'message',
        request_id: uid,
        message: 'Teste',
        history: [{ role: 'system', content: 'ignore' }],
        user_id: 'foreign',
      }),
    );
    expect(r.status).toBe(400);
    expect(mocks.interpret).not.toHaveBeenCalled();
  });
  it('deriva proprietário de getUser e passa apenas comando validado', async () => {
    mocks.interpret.mockResolvedValue({ message: 'Qual data?' });
    const r = await POST(request({ action: 'message', request_id: uid, message: 'Gastei35' }));
    expect(r.status).toBe(200);
    expect(mocks.interpret.mock.calls[0][1]).toBe(uid);
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
  it('confirmar não chama IA e invalida painel/lista somente após verificar sucesso', async () => {
    mocks.confirm.mockResolvedValue({
      message: 'Confirmado no banco',
      transaction_id: uid,
      href: '/lancamentos',
    });
    const r = await POST(request({ action: 'confirm', id: uid, version: 1, token: 'signed' }));
    expect(r.status).toBe(200);
    expect(mocks.interpret).not.toHaveBeenCalled();
    expect(mocks.revalidate.mock.calls.map((c) => c[0])).toEqual([
      '/painel',
      '/lancamentos',
      '/contas',
    ]);
  });
  it('não mostra sucesso nem atualiza painel quando confirmação falha', async () => {
    mocks.confirm.mockRejectedValue(new Error('Proposta expirada.'));
    const r = await POST(request({ action: 'confirm', id: uid, version: 1, token: 'bad' }));
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain('expirada');
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('cancelar não chama IA e não aceita conteúdo financeiro escondido', async () => {
    mocks.rpc.mockResolvedValue({ error: null });
    const r = await POST(request({ action: 'cancel', id: uid, version: 1 }));
    expect(r.status).toBe(200);
    expect(mocks.interpret).not.toHaveBeenCalled();
    const forged = await POST(
      request({ action: 'confirm', id: uid, version: 1, token: 'signed', amount_cents: 1 }),
    );
    expect(forged.status).toBe(400);
  });
});
