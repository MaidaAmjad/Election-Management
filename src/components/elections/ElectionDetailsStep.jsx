import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Select from '../ui/Select';
import { ELECTION_CATEGORIES } from '../../utils/electionConstants';

export default function ElectionDetailsStep({ form, onChange, errors = {}, readOnly = false }) {
  function setField(field, value) {
    onChange({ ...form, [field]: value });
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Election details</h3>
        <p className="mt-1 text-sm text-slate-500">
          Basic information and schedule for your election.
        </p>
      </div>

      <Input
        id="title"
        label="Election title"
        value={form.title}
        onChange={(e) => setField('title', e.target.value)}
        error={errors.title}
        disabled={readOnly}
        placeholder="School Election 2026"
      />

      <Textarea
        id="description"
        label="Description"
        value={form.description}
        onChange={(e) => setField('description', e.target.value)}
        error={errors.description}
        disabled={readOnly}
        rows={4}
      />

      <Select
        id="category"
        label="Category"
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
      />
    </section>
  );
}
