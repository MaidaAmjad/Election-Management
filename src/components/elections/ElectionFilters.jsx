import Input from '../ui/Input';
import Select from '../ui/Select';
import { ELECTION_STATUS_OPTIONS } from '../../utils/electionConstants';

export default function ElectionFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
      <Input
        id="search"
        label="Search elections"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by title..."
        className="sm:col-span-1 lg:col-span-2"
      />
      <Select
        id="status-filter"
        label="Filter by status"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
      >
        <option value="">All statuses</option>
        {ELECTION_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
    </div>
  );
}
