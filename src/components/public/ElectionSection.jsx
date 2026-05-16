import { Link } from 'react-router-dom';
import ElectionCard from './ElectionCard';
import ElectionCardSkeleton from './ElectionCardSkeleton';
import EmptyState from './EmptyState';
import { ROUTES } from '../../utils/constants';

export default function ElectionSection({
  title,
  description,
  elections,
  loading,
  liveVoteCounts,
  showViewAll = false,
  limit,
}) {
  const list = limit ? elections.slice(0, limit) : elections;

  return (
    <section className="py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-2 text-slate-600">{description}</p>
          )}
        </div>
        {showViewAll && (
          <Link
            to={ROUTES.PUBLIC_ELECTIONS}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View all elections →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit ?? 3 }).map((_, i) => (
            <ElectionCardSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()}`}
          description="Check back later or browse other categories."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((election) => (
            <ElectionCard
              key={election.id}
              election={election}
              liveVoteCount={liveVoteCounts?.[election.id]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
