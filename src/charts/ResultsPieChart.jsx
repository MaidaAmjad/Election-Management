import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function ResultsPieChart({ data }) {
  if (!data?.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">No vote data yet.</p>
    );
  }

  const filtered = data.filter((d) => d.votes > 0);

  if (!filtered.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">No votes recorded yet.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="votes"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
        >
          {filtered.map((entry, index) => (
            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${value} votes`, 'Votes']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
