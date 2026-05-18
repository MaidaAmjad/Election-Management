import Input from '../ui/Input';

export default function ElectionScheduleForm({
  form,
  onChange,
  errors = {},
  maxVotersDisabled = false,
  startDisabled = false,
  registrationDeadlineDisabled = false,
}) {
  function setField(field, value) {
    onChange({ ...form, [field]: value });
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Schedule & capacity</h3>
        <p className="mt-1 text-sm text-slate-500">
          After admin approval you can only change the schedule and voter capacity below.
          Title, description, category, polls, and candidates stay locked.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          id="start_datetime"
          type="datetime-local"
          label="Start date and time"
          value={form.start_datetime}
          onChange={(e) => setField('start_datetime', e.target.value)}
          error={errors.start_datetime}
          disabled={startDisabled}
        />
        <Input
          id="end_datetime"
          type="datetime-local"
          label="End date and time"
          value={form.end_datetime}
          onChange={(e) => setField('end_datetime', e.target.value)}
          error={errors.end_datetime}
        />
      </div>

      <Input
        id="registration_deadline"
        type="datetime-local"
        label="Registration deadline"
        value={form.registration_deadline}
        onChange={(e) => setField('registration_deadline', e.target.value)}
        error={errors.registration_deadline}
        disabled={registrationDeadlineDisabled}
      />

      <Input
        id="max_voters"
        type="number"
        min={1}
        label="Maximum voters"
        value={form.max_voters}
        onChange={(e) => setField('max_voters', e.target.value)}
        error={errors.max_voters}
        disabled={maxVotersDisabled}
      />
      <p className="text-sm text-slate-500">
        {maxVotersDisabled
          ? 'Maximum voters is locked after the voter list is finalized.'
          : 'Must be at least the number of voters already registered.'}
      </p>
    </section>
  );
}
