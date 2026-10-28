'use client';
import { useActionState, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { authAction, financeAction, type ActionState } from '@/app/actions';
function Submit({ label, destructive }: { label: string; destructive?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className={destructive ? 'btn danger' : 'btn primary'} disabled={pending} type="submit">
      {pending ? 'Aguarde…' : label}
    </button>
  );
}
export function ActionForm({
  operation,
  auth = false,
  children,
  label = 'Salvar',
  confirm,
  destructive = false,
  className = 'form',
}: {
  operation: string;
  auth?: boolean;
  children?: ReactNode;
  label?: string;
  confirm?: string;
  destructive?: boolean;
  className?: string;
}) {
  const action = (auth ? authAction : financeAction).bind(null, operation);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const locked = useRef(false);
  return (
    <form
      className={className}
      action={formAction}
      onSubmit={(e) => {
        if (locked.current || pending) {
          e.preventDefault();
          return;
        }
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        locked.current = true;
        // useFormStatus disables the button; the extra lock covers clicks before React commits.
        queueMicrotask(() => {
          locked.current = false;
        });
      }}
    >
      <fieldset disabled={pending} className="form-fields">
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="notice error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice success">
          {state.success}
        </p>
      )}
      <Submit label={label} destructive={destructive} />
    </form>
  );
}
export function HiddenId({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}
