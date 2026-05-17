import { WIZARD_STEP_LABELS } from '../../utils/electionValidation';

export default function ElectionWizardSteps({ currentStep }) {
  return (
    <nav aria-label="Election creation progress" className="mb-8">
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {WIZARD_STEP_LABELS.map((label, index) => {
          const step = index + 1;
          const active = step === currentStep;
          const done = step < currentStep;

          return (
            <li key={label} className="flex flex-1 items-center gap-3">
              <span
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  active
                    ? 'bg-primary-600 text-white shadow-md'
                    : done
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600',
                ].join(' ')}
              >
                {done ? '✓' : step}
              </span>
              <div className="min-w-0">
                <p
                  className={[
                    'text-sm font-semibold',
                    active ? 'text-primary-700' : 'text-slate-700',
                  ].join(' ')}
                >
                  Step {step}
                </p>
                <p className="truncate text-xs text-slate-500">{label}</p>
              </div>
              {index < WIZARD_STEP_LABELS.length - 1 && (
                <span className="hidden h-px flex-1 bg-slate-200 sm:block" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
