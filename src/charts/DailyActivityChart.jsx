import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function DailyActivityChart({ data }) {
  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No activity in range.</p>;
  }

  const chartData = data.map((d) => ({
    label: d.date ? String(d.date).slice(0, 10) : '',
    count: Number(d.count ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="count"
          name="Activities"
          stroke={CHART_COLORS[2]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
