// Browser-only test adapters; never imported by Next.js.
import { useSyncExternalStore } from 'react';
const subscribe = (fn: () => void) => {
  window.addEventListener('popstate', fn);
  return () => window.removeEventListener('popstate', fn);
};
function current() {
  return '/' + (new URLSearchParams(location.search).get('view') || 'conversar');
}
export const useRouter = () => ({
  refresh() {
    window.dispatchEvent(new Event('tato-test-refresh'));
  },
  push(href: string) {
    const url = new URL(href, location.origin);
    history.pushState(
      {},
      '',
      `/tests/ui/redesign.html?view=${url.pathname.slice(1)}${url.search ? '&' + url.search.slice(1) : ''}`,
    );
    window.dispatchEvent(new Event('popstate'));
  },
});
export const usePathname = () => useSyncExternalStore(subscribe, current, current);
