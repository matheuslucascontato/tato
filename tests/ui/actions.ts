// Isolated browser test adapter. Never imported by Next.js or included in app routes.
import type { ActionState } from '@/app/actions';
async function save(
  operation: string,
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const response = await fetch('/__test__/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, values: Object.fromEntries(form) }),
  });
  const result = await response.json();
  if (result.saved) {
    const previous = JSON.parse(sessionStorage.getItem('tato-ui-only-records') || '[]');
    if (!previous.some((r: { id: string }) => r.id === result.saved.id))
      sessionStorage.setItem('tato-ui-only-records', JSON.stringify([...previous, result.saved]));
    window.dispatchEvent(new Event('tato-test-refresh'));
  }
  return result;
}
export const saveFinanceAction = save;
export const authAction = save;
