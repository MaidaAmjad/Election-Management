import HeroSection from '../../components/public/HeroSection';
import FeaturesSection from '../../components/public/FeaturesSection';
import StatsSection from '../../components/public/StatsSection';
import LandingElectionsSection from '../../components/public/LandingElectionsSection';
import { usePublicElections } from '../../hooks/usePublicElections';
import { useLiveVoteCounts } from '../../hooks/useLiveVoteCounts';
import { usePublicLiveResults } from '../../hooks/usePublicLiveResults';

export default function LandingPage() {
  const { allElections, grouped, loading, error } = usePublicElections();

  const activeIds = grouped.active.map((e) => e.id);
  const liveVoteCounts = useLiveVoteCounts(activeIds);
  const liveResults = usePublicLiveResults(allElections);

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <StatsSection />

      <LandingElectionsSection
        grouped={grouped}
        loading={loading}
        error={error}
        liveVoteCounts={liveVoteCounts}
        liveResults={liveResults}
      />
    </>
  );
}
