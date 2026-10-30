'use client';
import { useActionState, useRef, useId, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppUI } from './ui/app-ui';
import { reactionForOperation, Mascot } from './brand/tato';
import { useFormStatus } from 'react-dom';
import { authAction, saveFinanceAction, type ActionState } from '@/app/actions';
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
  onSuccess,
  submitHidden = false,
}: {
  submitHidden?: boolean;
  onSuccess?: (state: ActionState) => void;
  operation: string;
  auth?: boolean;
  children?: ReactNode;
  label?: string;
  confirm?: string;
  destructive?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { notify } = useAppUI();
  const formRef = useRef<HTMLFormElement>(null);
  const errorId = useId();
  const action = async (previous: ActionState, form: FormData) => {
    try {
      const result = await (auth ? authAction : saveFinanceAction)(operation, previous, form);
      if (result.success && !auth) {
        notify({ message: result.success, expression: reactionForOperation(operation) });
        if (onSuccess) onSuccess(result);
        else if (result.destination) {
          router.push(result.destination);
          router.refresh();
        }
      }
      return result;
    } catch (error) {
      if (
        auth ||
        (error &&
          typeof error === 'object' &&
          'digest' in error &&
          String(error.digest).startsWith('NEXT_REDIRECT'))
      )
        throw error;
      return {
        error:
          'A resposta não chegou. Confira os lançamentos antes de tentar novamente. Este formulário mantém o mesmo identificador ao reenviar.',
      };
    } finally {
      formRef.current?.removeAttribute('data-pending');
      locked.current = false;
    }
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const locked = useRef(false);
  return (
    <form
      ref={formRef}
      className={className}
      onReset={(event) => event.preventDefault()}
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
        e.currentTarget.dataset.pending = 'true';
      }}
    >
      <fieldset
        disabled={pending}
        className="form-fields"
        aria-describedby={state.error ? errorId : undefined}
      >
        {children}
      </fieldset>
      {state.error && (
        <p id={errorId} role="alert" className="notice error">
          {/conta ou categoria.*disponível/i.test(state.error) && (
            <Mascot expression="surpreso" size={56} />
          )}
          {state.error}
        </p>
      )}
      {state.success && auth && (
        <p role="status" className="notice success">
          <Mascot expression="confiante" size={54} />
          {state.success}
        </p>
      )}
      {!submitHidden && <Submit label={label} destructive={destructive} />}
    </form>
  );
}
export function HiddenId({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}
