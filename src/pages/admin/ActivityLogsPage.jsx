import toast from 'react-hot-toast';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Pagination from '../../components/elections/Pagination';
import ActivityLogsTable from '../../components/admin/ActivityLogsTable';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { downloadCsv } from '../../utils/exportCsv';
import { logActivity } from '../../services/activityLogService';
import { ACTIVITY_ACTIONS } from '../../utils/adminConstants';
import { useAuth } from '../../hooks/useAuth';

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const {
    logs,
    allLogs,
    loading,
    error,
    search,
    setSearch,
    actionFilter,
    setActionFilter,
    actionOptions,
    page,
    setPage,
    totalPages,
    totalItems,
    pageSize,
  } = useActivityLogs();

  async function handleDownload() {
    try {
      downloadCsv('activity-logs.csv', allLogs, [
        { label: 'Action', getValue: (r) => r.action },
        { label: 'User', getValue: (r) => r.user_name },
        { label: 'Date', getValue: (r) => r.created_at },
        { label: 'Description', getValue: (r) => r.description },
      ]);
      await logActivity({
        userId: user?.id,
        action: ACTIVITY_ACTIONS.DASHBOARD_ACTION,
        description: 'Downloaded activity logs export.',
      });
      toast.success('Activity logs downloaded.');
    } catch (err) {
      toast.error(err.message ?? 'Failed to download logs.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Activity logs</h2>
          <p className="mt-1 text-slate-600">
            Audit trail of admin and user actions across the platform.
          </p>
        </div>
        <Button
          variant="secondary"
          className="gap-2"
          onClick={handleDownload}
          disabled={allLogs.length === 0}
        >
          <HiOutlineArrowDownTray className="h-4 w-4" aria-hidden="true" />
          Download logs
        </Button>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
        <Input
          id="log-search"
          label="Search logs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Action, user, description..."
        />
        <Select
          id="log-action-filter"
          label="Filter by action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">All actions</option>
          {actionOptions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <>
          <ActivityLogsTable logs={logs} />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </>
      )}
    </div>
  );
}
