import type { ComponentProps } from 'react';
// Next image optimization is covered by the real Next build; this harness serves assets directly.
export default function Image({
  src,
  alt,
  width,
  height,
  className,
  ...rest
}: ComponentProps<'img'> & { priority?: boolean; preload?: boolean }) {
  const props = Object.fromEntries(
    Object.entries(rest).filter(
      ([key]) => !['priority', 'preload', 'fill', 'quality'].includes(key),
    ),
  );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} className={className} {...props} />;
}
