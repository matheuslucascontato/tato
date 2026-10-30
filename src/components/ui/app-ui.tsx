'use client';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { Eye, EyeOff, X, CheckCircle2 } from 'lucide-react';
import { Mascot, type Expression } from '@/components/brand/tato';
type Flash = { message: string; expression: Expression };
const UI = createContext<{ hidden: boolean; toggle: () => void; notify: (flash: Flash) => void }>({
  hidden: false,
  toggle: () => {},
  notify: () => {},
});
export function AppUI({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false),
    [flash, setFlash] = useState<Flash>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function notify(value: Flash) {
    if (timer.current) clearTimeout(timer.current);
    setFlash(value);
    timer.current = setTimeout(() => setFlash(undefined), 5500);
  }
  return (
    <UI.Provider value={{ hidden, toggle: () => setHidden((v) => !v), notify }}>
      <div className={hidden ? 'values-private' : ''}>{children}</div>
      {flash && (
        <div className="feedback-toast" role="status">
          <Mascot expression={flash.expression} size={70} />
          <div>
            <strong>
              <CheckCircle2 size={16} aria-hidden="true" /> Tudo certo
            </strong>
            <p>{flash.message}</p>
          </div>
          <button
            className="icon-button"
            aria-label="Fechar confirmação"
            onClick={() => setFlash(undefined)}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </UI.Provider>
  );
}
export const useAppUI = () => useContext(UI);
export function PrivacyToggle() {
  const { hidden, toggle } = useAppUI();
  return (
    <button
      className="icon-button privacy-toggle"
      aria-pressed={hidden}
      aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
      onClick={toggle}
    >
      {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
    </button>
  );
}
export function MoneyValue({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const { hidden } = useAppUI();
  return (
    <span className={`money-value ${className}`} aria-label={hidden ? 'Valor oculto' : undefined}>
      {hidden ? '••••••' : children}
    </span>
  );
}
