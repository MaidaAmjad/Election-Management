import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../utils/resultsConstants';

export default function UserRolePieChart({ data }) {
  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No user data.</p>;
  }

  const chartData = data.map((d) => ({
    name: d.role ?? 'Unknown',
    value: Number(d.count ?? 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
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
