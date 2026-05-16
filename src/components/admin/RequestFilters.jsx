import Input from '../ui/Input';
import Select from '../ui/Select';
import { CREATOR_REQUEST_STATUS_OPTIONS } from '../../utils/adminConstants';

export default function RequestFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <Input
        id="request-search"
        label="Search requests"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Name, email, organization, ID..."
      />
      <Select
        id="request-status-filter"
        label="Filter by status"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
      >
        <option value="">All statuses</option>
        {CREATOR_REQUEST_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
    </div>
  );
}
