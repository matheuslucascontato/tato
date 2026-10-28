export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error(
      'Configuração incompleta: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  return { url, key };
}
export function siteURL() {
  // VERCEL_URL is injected by the platform, never read from request headers.
  // A Preview must not send authentication links to the developer's localhost.
  const previewOrigin =
    process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined;
  const value = process.env.NEXT_PUBLIC_SITE_URL || previewOrigin || 'http://localhost:3000';
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
  )
    throw new Error('Configure NEXT_PUBLIC_SITE_URL com a origem local ou HTTPS do preview.');
  return url.origin;
}
export function safeNext(value: string | null): '/painel' | '/redefinir-senha' {
  return value === '/redefinir-senha' ? value : '/painel';
}
