import { describe, it, expect } from 'vitest';
import { safeNext, siteURL } from '@/lib/supabase/config';
import { accountSchema, entrySchema, commitmentSchema } from '@/lib/validation';
const uuid = '10000000-0000-4000-8000-000000000001';
describe('redirecionamentos e validação de fronteira', () => {
  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/painel?next=https://evil.example',
    '/qualquer',
    null,
  ])('limita destino externo %s', (v) => expect(safeNext(v)).toBe('/painel'));
  it('permite somente a rota de recuperação explícita', () =>
    expect(safeNext('/redefinir-senha')).toBe('/redefinir-senha'));
  it('exige origem confiável para os e-mails', () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.test';
      expect(siteURL()).toBe('https://preview.example.test');
      process.env.NEXT_PUBLIC_SITE_URL = 'https://user:secret@preview.example.test';
      expect(() => siteURL()).toThrow();
      process.env.NEXT_PUBLIC_SITE_URL = 'http://external.example.test';
      expect(() => siteURL()).toThrow();
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
  it('usa a URL de Preview injetada pela Vercel sem depender de Host', () => {
    const keys = ['NEXT_PUBLIC_SITE_URL', 'VERCEL_ENV', 'VERCEL_URL'];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL_ENV = 'preview';
      process.env.VERCEL_URL = 'tato-teste.vercel.app';
      expect(siteURL()).toBe('https://tato-teste.vercel.app');
      process.env.NEXT_PUBLIC_SITE_URL = 'https://preview-explicito.example.test';
      expect(siteURL()).toBe('https://preview-explicito.example.test');
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL_ENV = 'production';
      expect(siteURL()).toBe('http://localhost:3000');
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
  it.each(['https://preview.example.test?next=externo', 'https://preview.example.test#fragmento'])(
    'rejeita origem com query ou fragmento %s',
    (value) => {
      const previous = process.env.NEXT_PUBLIC_SITE_URL;
      try {
        process.env.NEXT_PUBLIC_SITE_URL = value;
        expect(() => siteURL()).toThrow();
      } finally {
        if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
        else process.env.NEXT_PUBLIC_SITE_URL = previous;
      }
    },
  );
  it('normaliza apenas os campos permitidos e preserva saldo negativo', () => {
    const row = accountSchema.parse({
      name: '  Carteira ',
      initial_balance_cents: '-10,01',
      reference_date: '2020-01-01',
      user_id: uuid,
    });
    expect(row).toEqual({
      name: 'Carteira',
      initial_balance_cents: -1001,
      reference_date: '2020-01-01',
    });
  });
  it('separa datas futuras de lançamentos realizados', () => {
    const common = {
      description: 'Teste',
      amount_cents: '1,00',
      category_id: uuid,
      kind: 'expense',
    };
    expect(
      entrySchema.safeParse({ ...common, account_id: uuid, occurred_on: '2099-01-01' }).success,
    ).toBe(false);
    const c = commitmentSchema.parse({ ...common, account_id: '', due_on: '2099-01-01' });
    expect(c.account_id).toBeNull();
  });
});
