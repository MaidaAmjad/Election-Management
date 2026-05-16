import PublicElectionFilters from '../../components/public/PublicElectionFilters';
import ElectionSection from '../../components/public/ElectionSection';
import { usePublicElections } from '../../hooks/usePublicElections';
import { useLiveVoteCounts } from '../../hooks/useLiveVoteCounts';

export default function PublicElectionsPage() {
  const {
    grouped,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
  } = usePublicElections();

  const activeIds = grouped.active.map((e) => e.id);
  const liveVoteCounts = useLiveVoteCounts(activeIds);

  const showUpcoming = !statusFilter || statusFilter === 'Upcoming';
  const showActive = !statusFilter || statusFilter === 'Active';
  const showCompleted = !statusFilter || statusFilter === 'Completed';

  return (
    <div className="bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Elections
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Search and filter published elections. Active elections show live
            vote counts.
          </p>
        </header>

        <PublicElectionFilters
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {error && (
          <div
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="mt-10 space-y-4">
          {showUpcoming && (
            <ElectionSection
              title="Upcoming Elections"
              elections={grouped.upcoming}
              loading={loading}
              liveVoteCounts={liveVoteCounts}
            />
          )}
          {showActive && (
            <ElectionSection
              title="Active Elections"
              elections={grouped.active}
              loading={loading}
              liveVoteCounts={liveVoteCounts}
            />
          )}
          {showCompleted && (
            <ElectionSection
              title="Completed Elections"
              elections={grouped.completed}
              loading={loading}
              liveVoteCounts={liveVoteCounts}
            />
          )}
        </div>
      </div>
    </div>
  );
}
