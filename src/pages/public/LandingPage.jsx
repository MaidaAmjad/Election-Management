import { Link } from 'react-router-dom';
import HeroSection from '../../components/public/HeroSection';
import FeaturesSection from '../../components/public/FeaturesSection';
import StatsSection from '../../components/public/StatsSection';
import ElectionSection from '../../components/public/ElectionSection';
import { usePublicElections } from '../../hooks/usePublicElections';
import { useLiveVoteCounts } from '../../hooks/useLiveVoteCounts';
import { ROUTES } from '../../utils/constants';

export default function LandingPage() {
  const { grouped, loading, error } = usePublicElections();

  const activeIds = grouped.active.map((e) => e.id);
  const liveVoteCounts = useLiveVoteCounts(activeIds);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <StatsSection />

      <section id="elections" className="bg-slate-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">Elections</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Browse upcoming, active, and completed elections. No account
              required to view details.
            </p>
            <Link
              to={ROUTES.PUBLIC_ELECTIONS}
              className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              Search and filter all elections →
            </Link>
          </div>

          {error && (
            <div
              className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <ElectionSection
            title="Upcoming Elections"
            description="Registration open — voting has not started yet."
            elections={grouped.upcoming}
            loading={loading}
            liveVoteCounts={liveVoteCounts}
            showViewAll
            limit={3}
          />
          <ElectionSection
            title="Active Elections"
            description="Voting is open now. Vote counts update in real time."
            elections={grouped.active}
            loading={loading}
            liveVoteCounts={liveVoteCounts}
            showViewAll
            limit={3}
          />
          <ElectionSection
            title="Completed Elections"
            description="Final results are available for review."
            elections={grouped.completed}
            loading={loading}
            liveVoteCounts={liveVoteCounts}
            showViewAll
            limit={3}
          />
        </div>
      </section>
    </>
  );
}
