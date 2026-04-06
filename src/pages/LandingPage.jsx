import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import HomepageNav      from '../components/homepage/HomepageNav';
import HeroSection      from '../components/homepage/HeroSection';
import StatsBar         from '../components/homepage/StatsBar';
import FeatureShowcase  from '../components/homepage/FeatureShowcase';
import HowItWorks       from '../components/homepage/HowItWorks';
import XpShowcase       from '../components/homepage/XpShowcase';
import FinalCTA         from '../components/homepage/FinalCTA';
import HomepageFooter   from '../components/homepage/HomepageFooter';

export default function LandingPage() {
  const { currentUser } = useAuth();

  if (currentUser) return <Navigate to="/dashboard" replace />;

  return (
    <div className="bg-brand-bg scroll-smooth">
      <HomepageNav />
      <HeroSection />
      <StatsBar />
      <FeatureShowcase />
      <HowItWorks />
      <XpShowcase />
      <FinalCTA />
      <HomepageFooter />
    </div>
  );
}
