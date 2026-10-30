'use client';
import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { ActionForm } from './action-form';
import { AccountFields } from './fields';
import { Mascot } from './brand/tato';
import type { Account } from '@/lib/types';
export function SetupForm({
  name,
  account,
  today,
}: {
  name?: string;
  account?: Account;
  today: string;
}) {
  const [step, setStep] = useState(1);
  const content = useRef<HTMLDivElement>(null);
  function next() {
    const inputs = content.current?.querySelectorAll<HTMLInputElement>('input');
    if (inputs && [...inputs].some((i) => !i.reportValidity())) return;
    setStep(2);
  }
  return (
    <>
      <ol className="setup-progress" aria-label="Progresso da configuração">
        <li aria-current={step === 1 ? 'step' : undefined}>
          <span>{step > 1 ? <Check size={16} /> : '1'}</span>Como chamar você
        </li>
        <li aria-current={step === 2 ? 'step' : undefined}>
          <span>2</span>Primeira conta
        </li>
      </ol>
      <div className="setup-heading">
        <div>
          <p className="eyebrow">PASSO {step} DE 2</p>
          <h1>{step === 1 ? 'Vamos começar pelo seu nome?' : 'Seu ponto de partida.'}</h1>
          <p className="muted">
            {step === 1
              ? 'Um jeito mais próximo de cuidar das suas finanças.'
              : 'Cadastre uma conta manual. Nenhuma conexão com o banco.'}
          </p>
        </div>
        <Mascot expression="explicando" size={110} />
      </div>
      <section className="panel setup-card">
        <ActionForm operation="onboard" label="Concluir configuração" submitHidden={step !== 2}>
          <div ref={content} hidden={step !== 1}>
            <label>
              Como podemos chamar você?
              <input
                name="display_name"
                required
                maxLength={120}
                autoComplete="given-name"
                defaultValue={name}
                placeholder="Seu nome"
              />
            </label>
          </div>
          <div hidden={step !== 2}>
            <AccountFields account={account} today={today} locked={!!account} />
            <p className="field-help">
              As categorias iniciais serão preparadas para você. Se sair antes de salvar, seus dados
              ainda não serão cadastrados; use “Voltar” para revisar sem perder o que digitou.
            </p>
          </div>
          {step === 1 ? (
            <button type="button" className="btn primary" onClick={next}>
              Continuar <ArrowRight size={18} />
            </button>
          ) : (
            <button type="button" className="text-link" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Voltar ao nome
            </button>
          )}
        </ActionForm>
      </section>
    </>
  );
}
