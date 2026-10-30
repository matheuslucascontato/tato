'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { Account, Category, Kind } from '@/lib/types';
import { ActionForm, HiddenId } from './action-form';
import { EntryFields } from './fields';
const Quick = createContext<(kind?: Kind) => void>(() => {});
export function QuickEntryProvider({
  children,
  accounts,
  categories,
  today,
}: {
  children: ReactNode;
  accounts: Account[];
  categories: Category[];
  today: string;
}) {
  const [draft, setDraft] = useState<{ id: string; kind: Kind }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const dirty = useRef(false);
  const router = useRouter();
  function open(kind: Kind = 'expense') {
    trigger.current = document.activeElement as HTMLElement;
    dirty.current = false;
    setDraft({ id: crypto.randomUUID(), kind });
  }
  useEffect(() => {
    if (draft && !dialog.current?.open) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLInputElement>('[name="amount_cents"]')?.focus();
    }
  }, [draft]);
  function dismiss() {
    if (dialog.current?.querySelector('form[data-pending="true"]')) return;
    if (dirty.current && !window.confirm('Descartar os dados deste lançamento?')) return;
    dialog.current?.close();
  }
  function closed() {
    setDraft(undefined);
    dirty.current = false;
    trigger.current?.focus();
  }
  return (
    <Quick.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        className="quick-dialog"
        aria-labelledby="quick-title"
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return;
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              'button,input:not([type="hidden"]),select,textarea,a[href],[tabindex="0"]',
            ),
          ].filter(
            (el) =>
              !el.matches(':disabled') && el.getClientRects().length > 0 && !el.closest('[hidden]'),
          );
          const first = items[0],
            last = items[items.length - 1];
          if (!first) {
            event.preventDefault();
            return;
          }
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        onClose={closed}
        onCancel={(e) => {
          e.preventDefault();
          dismiss();
        }}
        onClick={(e) => {
          if (e.target === dialog.current) dismiss();
        }}
      >
        <div className="dialog-surface">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">UM REGISTRO, MAIS CLAREZA</p>
              <h2 id="quick-title">Registrar lançamento</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar registro rápido"
              onClick={dismiss}
            >
              <X size={22} />
            </button>
          </div>
          {draft &&
            (accounts.some((a) => !a.archived) ? (
              <div
                onChangeCapture={() => {
                  dirty.current = true;
                }}
              >
                <ActionForm
                  key={draft.id}
                  operation="transaction-create"
                  label="Salvar lançamento"
                  onSuccess={() => {
                    dirty.current = false;
                    dialog.current?.close();
                    router.refresh();
                  }}
                >
                  <HiddenId id={draft.id} />
                  <EntryFields
                    accounts={accounts}
                    categories={categories}
                    today={today}
                    initialKind={draft.kind}
                    featured
                  />
                </ActionForm>
              </div>
            ) : (
              <div className="notice warning">
                <p>Cadastre ou reative uma conta manual para registrar.</p>
                <Link
                  href="/contas"
                  onClick={() => dialog.current?.close()}
                  className="btn primary"
                >
                  Abrir contas
                </Link>
              </div>
            ))}
          <p className="field-help dialog-footnote">
            Só receitas e despesas já realizadas. Para o que vem pela frente, use Compromissos.
          </p>
        </div>
      </dialog>
    </Quick.Provider>
  );
}
export function QuickEntryButton({
  kind = 'expense',
  children,
  className = 'btn primary',
}: {
  kind?: Kind;
  children?: ReactNode;
  className?: string;
}) {
  const open = useContext(Quick);
  return (
    <button className={className} onClick={() => open(kind)} type="button">
      {kind === 'income' ? (
        <ArrowDownLeft size={18} />
      ) : children ? (
        <ArrowUpRight size={18} />
      ) : (
        <Plus size={19} />
      )}
      <span>{children || 'Registrar lançamento'}</span>
    </button>
  );
}
