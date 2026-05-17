import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import AuditStatCards from '../../components/audit/AuditStatCards';
import AuditLogsTable from '../../components/audit/AuditLogsTable';
import AuditLogDetailModal from '../../components/audit/AuditLogDetailModal';
import OverrideLogsTable from '../../components/audit/OverrideLogsTable';
import AuditActivityTrendChart from '../../charts/AuditActivityTrendChart';
import AuditModulePieChart from '../../charts/AuditModulePieChart';
import AuditDistributionBarChart from '../../charts/AuditDistributionBarChart';
import { useAuth } from '../../hooks/useAuth';
import { useAuditDashboard } from '../../hooks/useAuditDashboard';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import {
  canExportAuditLogs,
  fetchAuditLogById,
  fetchAuditLogs,
  fetchOverrideLogs,
  subscribeToAuditLogs,
} from '../../services/auditLogService';
import {
  exportAuditLogsToCsv,
  exportAuditLogsToExcel,
  exportAuditLogsToPdf,
  exportSingleLogToCsv,
} from '../../utils/exportAuditLogs';
import { AUDIT_MODULES } from '../../utils/auditConstants';
import { hasRole } from '../../utils/roleHelpers';
import { USER_ROLES } from '../../utils/constants';
import { toDateEndIso, toDateStartIso } from '../../utils/auditFormatters';

const MODULE_OPTIONS = Object.values(AUDIT_MODULES);

export default function AuditTransparencyPage({ title, subtitle }) {
  const { role } = useAuth();
  const isAdmin = hasRole(role, [USER_ROLES.SUPER_ADMIN]);
  const isCreator = hasRole(role, [USER_ROLES.ELECTION_CREATOR]);

  const [tab, setTab] = useState('dashboard');
  const [canExport, setCanExport] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [overrideRows, setOverrideRows] = useState([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const dashboard = useAuditDashboard(30);
  const logs = useAuditLogs();

  useEffect(() => {
    canExportAuditLogs().then(setCanExport);
  }, []);

  const refreshAll = useCallback(() => {
    dashboard.refresh();
    logs.refresh();
    if (isAdmin) loadOverrides();
  }, [dashboard, logs, isAdmin]);

  useEffect(() => {
    return subscribeToAuditLogs(refreshAll);
  }, [refreshAll]);

  async function loadOverrides() {
    if (!isAdmin) return;
    setOverrideLoading(true);
    try {
      const data = await fetchOverrideLogs({ page: 1, pageSize: 50 });
      setOverrideRows(data.rows ?? []);
    } catch (err) {
      toast.error(err.message ?? 'Failed to load override logs.');
    } finally {
      setOverrideLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'overrides' && isAdmin) loadOverrides();
  }, [tab, isAdmin]);

  async function openDetail(row) {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const full = await fetchAuditLogById(row.id);
      setDetailLog(full);
    } catch (err) {
      toast.error(err.message ?? 'Could not load log.');
      setDetailLog(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function fetchLogsForExport(scope) {
    const pageSize = 500;
    let page = 1;
    let all = [];
    let total = 0;

    do {
      const data = await fetchAuditLogs({
        search: scope === 'filtered' ? logs.search : null,
        role: scope === 'filtered' ? logs.role : null,
        module: scope === 'filtered' ? logs.module : null,
        actionType: scope === 'filtered' ? logs.actionType : null,
        dateFrom: scope === 'filtered' ? toDateStartIso(logs.dateFrom) : null,
        dateTo: scope === 'filtered' ? toDateEndIso(logs.dateTo) : null,
        page,
        pageSize,
      });
      all = all.concat(data.rows ?? []);
      total = Number(data.total ?? 0);
      page += 1;
    } while (all.length < total && page < 20);

    return all;
  }

  async function handleExport(format, scope) {
    if (!canExport) {
      toast.error('Export is limited to Super Admin.');
      return;
    }
    setExporting(true);
    try {
      let rows = logs.rows;
      if (scope === 'all' || scope === 'filtered') {
        rows = await fetchLogsForExport(scope);
      } else if (scope === 'selected') {
        rows = logs.rows.filter((r) => logs.selectedIds.has(r.id));
        if (!rows.length) {
          toast.error('Select at least one log.');
          return;
        }
      }

      if (format === 'csv') exportAuditLogsToCsv(rows);
      else if (format === 'excel') exportAuditLogsToExcel(rows);
      else exportAuditLogsToPdf(rows);

      toast.success('Logs exported.');
    } catch (err) {
      toast.error(err.message ?? 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  const pageTitle = title ?? 'Audit & Transparency';
  const pageSubtitle =
    subtitle ??
    (isAdmin
      ? 'Full system audit trail, transparency metrics, and override history.'
      : isCreator
        ? 'Activity on your elections and your own actions.'
        : 'Your personal activity on the platform.');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{pageTitle}</h2>
        <p className="mt-1 text-slate-600">{pageSubtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Transparency dashboard
        </TabButton>
        <TabButton active={tab === 'logs'} onClick={() => setTab('logs')}>
          Activity logs
        </TabButton>
        {isAdmin && (
          <TabButton active={tab === 'overrides'} onClick={() => setTab('overrides')}>
            Override logs
          </TabButton>
        )}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          {dashboard.loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : dashboard.error ? (
            <p className="text-red-600">{dashboard.error}</p>
          ) : (
            <>
              <AuditStatCards stats={dashboard.stats} />
              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard title="Daily activity">
                  <AuditActivityTrendChart data={dashboard.stats?.activity_trend} />
                </ChartCard>
                <ChartCard title="Log type distribution (by module)">
                  <AuditModulePieChart data={dashboard.stats?.module_distribution} />
                </ChartCard>
                <ChartCard title="Action type distribution">
                  <AuditDistributionBarChart data={dashboard.stats?.action_distribution} />
                </ChartCard>
                <ChartCard title="User activity">
                  <AuditDistributionBarChart data={dashboard.stats?.user_activity} />
                </ChartCard>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterInput label="Search" value={logs.search} onChange={logs.setSearch} />
            <FilterSelect label="Role" value={logs.role} onChange={logs.setRole}>
              <option value="all">All roles</option>
              {logs.filterOptions.roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Module" value={logs.module} onChange={logs.setModule}>
              <option value="all">All modules</option>
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="Action type"
              value={logs.actionType}
              onChange={logs.setActionType}
            >
              <option value="all">All actions</option>
              {logs.filterOptions.actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </FilterSelect>
            <FilterInput
              label="From date"
              type="date"
              value={logs.dateFrom}
              onChange={logs.setDateFrom}
            />
            <FilterInput label="To date" type="date" value={logs.dateTo} onChange={logs.setDateTo} />
          </div>

          {canExport && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={exporting}
                onClick={() => handleExport('csv', 'filtered')}
              >
                Export filtered (CSV)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={exporting}
                onClick={() => handleExport('excel', 'all')}
              >
                Export all (Excel)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={exporting}
                onClick={() => handleExport('pdf', 'selected')}
              >
                Export selected (PDF)
              </Button>
            </div>
          )}

          {logs.loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : logs.error ? (
            <p className="text-red-600">{logs.error}</p>
          ) : (
            <>
              <AuditLogsTable
                rows={logs.rows}
                selectedIds={logs.selectedIds}
                onToggleSelect={logs.toggleSelect}
                onView={openDetail}
                onDownloadOne={canExport ? exportSingleLogToCsv : null}
                showExportSelect={canExport}
              />
              <div className="flex items-center justify-between text-sm text-slate-600">
                <p>
                  Page {logs.page} of {logs.totalPages} ({logs.total} entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={logs.page <= 1}
                    onClick={() => logs.setPage(logs.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={logs.page >= logs.totalPages}
                    onClick={() => logs.setPage(logs.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'overrides' && isAdmin && (
        <div>
          {overrideLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <OverrideLogsTable rows={overrideRows} />
          )}
        </div>
      )}

      <AuditLogDetailModal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailLog(null);
        }}
        log={detailLog}
        loading={detailLoading}
      />
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'border-b-2 px-4 py-2 text-sm font-medium',
        active
          ? 'border-primary-600 text-primary-700'
          : 'border-transparent text-slate-600 hover:text-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FilterInput({ label, value, onChange, type = 'search' }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase text-slate-500">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      >
        {children}
      </select>
    </div>
  );
}
