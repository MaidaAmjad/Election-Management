import Button from '../ui/Button';

export default function SecretIdInput({
  value,
  onChange,
  onValidate,
  validating,
  validated,
  disabled,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Verify Secret ID</h3>
      <p className="mt-1 text-sm text-slate-600">
        Enter the secret voting ID emailed to you for this poll (e.g. POLL-A-0001).
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="secret-id" className="sr-only">
            Secret ID
          </label>
          <input
            id="secret-id"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            disabled={disabled || validated}
            placeholder="POLL-A-0001"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase tracking-wide disabled:bg-slate-50"
          />
        </div>
        <Button
          type="button"
          variant={validated ? 'secondary' : 'primary'}
          onClick={onValidate}
          disabled={disabled || validating || validated || !value.trim()}
          isLoading={validating}
        >
          {validated ? 'Verified' : 'Verify ID'}
        </Button>
      </div>

      {validated && (
        <p className="mt-3 text-sm font-medium text-emerald-700">
          Secret ID verified. Select your candidate below.
        </p>
      )}
    </section>
  );
}
