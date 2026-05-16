import Input from '../ui/Input';
import Select from '../ui/Select';
import { CANDIDATE_SORT_OPTIONS } from '../../utils/candidateConstants';

export default function CandidateFilters({
  search,
  onSearchChange,
  electionFilter,
  onElectionFilterChange,
  sortBy,
  onSortChange,
  electionOptions,
}) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
      <Input
        id="candidate-search"
        label="Search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by name..."
        className="sm:col-span-2"
      />
      <Select
        id="candidate-election-filter"
        label="Filter by election"
        value={electionFilter}
        onChange={(e) => onElectionFilterChange(e.target.value)}
      >
        <option value="">All elections</option>
        {electionOptions.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.title}
          </option>
        ))}
      </Select>
      <Select
        id="candidate-sort"
        label="Sort"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
      >
        {CANDIDATE_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
