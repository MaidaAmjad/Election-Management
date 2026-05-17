import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchAuditLogs, subscribeToAuditLogs } from '../services/auditLogService';
import { AUDIT_PAGE_SIZE } from '../utils/auditConstants';
import { toDateEndIso, toDateStartIso } from '../utils/auditFormatters';

export function useAuditLogs(initialFilters = {}) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState(initialFilters.search ?? '');
  const [role, setRole] = useState(initialFilters.role ?? 'all');
  const [module, setModule] = useState(initialFilters.module ?? 'all');
  const [actionType, setActionType] = useState(initialFilters.actionType ?? 'all');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo ?? '');
  const [page, setPage] = useState(1);
  const [sortDesc, setSortDesc] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs({
        search,
        role,
        module,
        actionType,
        dateFrom: toDateStartIso(dateFrom),
        dateTo: toDateEndIso(dateTo),
        page,
        pageSize: AUDIT_PAGE_SIZE,
      });
      setRows(data.rows ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (err) {
      setError(err.message ?? 'Failed to load logs.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, role, module, actionType, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeToAuditLogs(load);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, role, module, actionType, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortDesc ? tb - ta : ta - tb;
    });
    return list;
  }, [rows, sortDesc]);

  const filterOptions = useMemo(() => {
    const roles = new Set();
    const modules = new Set();
    const actions = new Set();
    rows.forEach((r) => {
      if (r.role) roles.add(r.role);
      if (r.module_name) modules.add(r.module_name);
      if (r.action_type) actions.add(r.action_type);
    });
    return {
      roles: [...roles].sort(),
      modules: [...modules].sort(),
      actions: [...actions].sort(),
    };
  }, [rows]);

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  return {
    rows: sortedRows,
    total,
    loading,
    error,
    search,
    setSearch,
    role,
    setRole,
    module,
    setModule,
    actionType,
    setActionType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    totalPages,
    sortDesc,
    setSortDesc,
    selectedIds,
    toggleSelect,
    clearSelection,
    filterOptions,
    refresh: load,
    total,
  };
}
