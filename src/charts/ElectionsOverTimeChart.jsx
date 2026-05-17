import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function ElectionsOverTimeChart({ data }) {
  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No election data in range.</p>;
  }

  const chartData = data.map((d) => ({
    label: d.date ? String(d.date).slice(0, 10) : '',
    count: Number(d.count ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="count"
          name="Elections"
          stroke={CHART_COLORS[0]}
          fill={CHART_COLORS[0]}
          fillOpacity={0.2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
