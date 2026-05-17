import * as XLSX from 'xlsx';

export function exportAdminDashboardReport({ cards, charts, activity, generatedAt }) {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    ['Metric', 'Value'],
    ['Total Elections', cards?.total_elections ?? 0],
    ['Active Elections', cards?.active_elections ?? 0],
    ['Upcoming Elections', cards?.upcoming_elections ?? 0],
    ['Completed Elections', cards?.completed_elections ?? 0],
    ['Total Users', cards?.total_users ?? 0],
    ['Election Creators', cards?.total_creators ?? 0],
    ['Voters', cards?.total_voters ?? 0],
    ['Total Votes Cast', cards?.total_votes_cast ?? 0],
    ['Generated', generatedAt ?? new Date().toISOString()],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

  if (charts?.elections_over_time?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        charts.elections_over_time.map((r) => ({
          Date: r.date,
          Elections: r.count,
        })),
      ),
      'Elections Over Time',
    );
  }

  if (charts?.user_distribution?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        charts.user_distribution.map((r) => ({
          Role: r.role,
          Count: r.count,
        })),
      ),
      'Users by Role',
    );
  }

  if (activity?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        activity.map((a) => ({
          Time: a.created_at,
          Action: a.action_type,
          Module: a.module_name,
          Description: a.description,
          User: a.user_name,
        })),
      ),
      'Recent Activity',
    );
  }

  XLSX.writeFile(wb, `admin-dashboard-report-${Date.now()}.xlsx`);
}
