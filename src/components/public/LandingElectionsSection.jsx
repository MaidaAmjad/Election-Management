import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ElectionSection from './ElectionSection';
import PublicLiveResultsPanel from './PublicLiveResultsPanel';
import { ROUTES } from '../../utils/constants';

const MAIN_TABS = [
  { id: 'elections', label: 'Elections' },
  { id: 'results', label: 'Results' },
];

const RESULT_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
];

export default function LandingElectionsSection({
  grouped,
  loading,
  error,
  liveVoteCounts,
  liveResults,
}) {
  const [mainTab, setMainTab] = useState('elections');
  const [resultsFilter, setResultsFilter] = useState('all');

  useEffect(() => {
    if (window.location.hash === '#results') {
      setMainTab('results');
    }
  }, []);

  return (
    <section id="elections" className="bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Elections</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Browse elections or watch live vote totals by poll — no account required.
          </p>
          <Link
            to={ROUTES.PUBLIC_ELECTIONS}
            className="mt-4 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            Search and filter all elections →
          </Link>
        </div>

        <div
          className="mb-10 flex justify-center"
          role="tablist"
          aria-label="Elections section"
        >
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={mainTab === tab.id}
                onClick={() => setMainTab(tab.id)}
                className={[
                  'rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
                  mainTab === tab.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {mainTab === 'elections' ? (
          <div role="tabpanel" aria-label="Elections">
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
        ) : (
          <div role="tabpanel" id="results"
            aria-label="Live results">
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {RESULT_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setResultsFilter(f.id)}
                  className={[
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    resultsFilter === f.id
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <PublicLiveResultsPanel
              active={liveResults.active}
              completed={liveResults.completed}
              loading={liveResults.loading}
              error={liveResults.error}
              filter={resultsFilter}
            />
          </div>
        )}
      </div>
    </section>
  );
}
