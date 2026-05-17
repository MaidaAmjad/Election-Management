import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function ElectionStatusPieChart({ data }) {
  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No elections.</p>;
  }

  const chartData = data
    .map((d) => ({ name: d.name, value: Number(d.value ?? 0) }))
    .filter((d) => d.value > 0);

  if (!chartData.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No elections.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
