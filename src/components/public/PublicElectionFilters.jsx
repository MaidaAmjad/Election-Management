import Input from '../ui/Input';
import Select from '../ui/Select';
import {
  PUBLIC_CATEGORY_OPTIONS,
  PUBLIC_SORT_OPTIONS,
  PUBLIC_STATUS_FILTERS,
} from '../../utils/publicElectionConstants';

export default function PublicElectionFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortChange,
}) {
  return (
    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-4">
      <Input
        id="public-election-search"
        label="Search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Title or category..."
        className="lg:col-span-2"
      />
      <Select
        id="public-status-filter"
        label="Status"
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
      >
        {PUBLIC_STATUS_FILTERS.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Select
        id="public-category-filter"
        label="Category"
        value={categoryFilter}
        onChange={(e) => onCategoryFilterChange(e.target.value)}
      >
        {PUBLIC_CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Select
        id="public-sort"
        label="Sort by"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="lg:col-span-4 lg:max-w-xs"
      >
        {PUBLIC_SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
