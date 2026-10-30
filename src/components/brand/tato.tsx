import Image from 'next/image';
export const expressions = {
  atento: 'atento',
  feliz: 'feliz',
  pensativo: 'pensativo',
  cuidadoso: 'cuidadoso',
  explicando: 'explicando',
  comemorando: 'comemorando',
  surpreso: 'surpreso',
  confiante: 'confiante',
} as const;
export type Expression = keyof typeof expressions;
export function Mascot({
  expression = 'atento',
  size = 112,
  informative = false,
  className = '',
}: {
  expression?: Expression;
  size?: number;
  informative?: boolean;
  className?: string;
}) {
  return (
    <Image
      className={`tato-mascot ${className}`}
      src={`/brand/tato/${expressions[expression] || expressions.atento}.webp`}
      width={size}
      height={size}
      sizes={`${size}px`}
      alt={informative ? `Tato, ${expression}` : ''}
      aria-hidden={!informative}
      data-expression={expression}
    />
  );
}
export function Brand({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <span className={`brand-lockup ${dark ? 'on-dark' : ''} ${compact ? 'compact' : ''}`}>
      <Image
        src="/brand/tato/logo-horizontal.webp"
        width={720}
        height={191}
        sizes={compact ? '140px' : '180px'}
        alt="Tato"
        priority
      />
    </span>
  );
}
export const reactionForOperation = (operation: string): Expression =>
  ['onboard', 'settle'].includes(operation)
    ? 'comemorando'
    : ['transaction-create', 'account-create'].includes(operation)
      ? 'feliz'
      : 'confiante';
