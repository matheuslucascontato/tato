// Browser-only test adapter; never imported by the Next.js application.
export const useRouter = () => ({
  refresh() {
    window.dispatchEvent(new Event('tato-test-refresh'));
  },
});
export const usePathname = () => '/conversar';
