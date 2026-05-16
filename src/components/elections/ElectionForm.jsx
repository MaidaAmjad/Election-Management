import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import PollsManager from './PollsManager';
import { ELECTION_CATEGORIES } from '../../utils/electionConstants';

export default function ElectionForm({
  form,
  onChange,
  errors = {},
  readOnly = false,
}) {
  function setField(field, value) {
    onChange({ ...form, [field]: value });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Election details</h3>

        <Input
          id="title"
          label="Election title"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          error={errors.title}
          disabled={readOnly}
          placeholder="Spring 2026 Student Government Election"
        />

        <Textarea
          id="description"
          label="Election description"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          error={errors.description}
          disabled={readOnly}
          rows={4}
          placeholder="Describe the purpose and scope of this election"
        />

        <Select
          id="category"
          label="Election category"
          value={form.category}
          onChange={(e) => setField('category', e.target.value)}
          error={errors.category}
          disabled={readOnly}
        >
          <option value="">Select a category</option>
          {ELECTION_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </Select>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="start_datetime"
            type="datetime-local"
            label="Start date and time"
            value={form.start_datetime}
            onChange={(e) => setField('start_datetime', e.target.value)}
            error={errors.start_datetime}
            disabled={readOnly}
          />
          <Input
            id="end_datetime"
            type="datetime-local"
            label="End date and time"
            value={form.end_datetime}
            onChange={(e) => setField('end_datetime', e.target.value)}
            error={errors.end_datetime}
            disabled={readOnly}
          />
        </div>

        <Input
          id="registration_deadline"
          type="datetime-local"
          label="Registration deadline"
          value={form.registration_deadline}
          onChange={(e) => setField('registration_deadline', e.target.value)}
          error={errors.registration_deadline}
          disabled={readOnly}
        />

        <Input
          id="max_voters"
          type="number"
          min={1}
          label="Maximum voters"
          value={form.max_voters}
          onChange={(e) => setField('max_voters', e.target.value)}
          error={errors.max_voters}
          disabled={readOnly}
          placeholder="1000"
        />
      </section>

      <PollsManager
        polls={form.polls}
        onChange={(polls) => onChange({ ...form, polls })}
        errors={errors}
        readOnly={readOnly}
      />
    </div>
  );
}
