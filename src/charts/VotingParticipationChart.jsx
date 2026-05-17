import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function VotingParticipationChart({ data }) {
  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No voting data yet.</p>;
  }

  const chartData = data.map((d) => ({
    name: d.title?.length > 18 ? `${d.title.slice(0, 16)}…` : d.title,
    votes: Number(d.votes ?? 0),
    registered: Number(d.registered ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="registered" name="Registered" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="votes" name="Votes cast" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
