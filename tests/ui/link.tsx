import type { ComponentProps } from 'react';
import { useRouter } from './router';
export default function Link({ onClick, href, ...props }: ComponentProps<'a'>) {
  const router = useRouter();
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && href?.startsWith('/') && !href.startsWith('/tests/')) {
          event.preventDefault();
          router.push(href);
        }
      }}
    />
  );
}
