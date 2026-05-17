export default function PollResultsFilter({ polls, value, onChange }) {
  if (!polls?.length) return null;

  return (
    <div className="max-w-xs">
      <label className="block text-xs font-medium uppercase text-slate-500">
        Filter by poll
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="all">All polls (combined)</option>
        {polls.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}
