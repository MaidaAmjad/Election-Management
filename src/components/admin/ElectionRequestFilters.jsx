import Input from '../ui/Input';
import Select from '../ui/Select';
import { ELECTION_APPROVAL_STATUS_OPTIONS } from '../../utils/electionApprovalConstants';

export default function ElectionRequestFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
      <Input
        id="election-request-search"
        label="Search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Election title, creator, organization..."
      />
      <Select
        id="election-request-status"
        label="Approval status"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
      >
        <option value="">All requests</option>
        {ELECTION_APPROVAL_STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </Select>
    </div>
  );
}
