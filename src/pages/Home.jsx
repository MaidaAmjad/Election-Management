import { Link } from 'react-router-dom';
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineChartBar,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { ROUTES } from '../utils/constants';
import { getDashboardPathForRole } from '../utils/roleHelpers';

const features = [
  {
    icon: HiOutlineLockClosed,
    title: 'Secure authentication',
    description:
      'Industry-standard auth powered by Supabase with encrypted sessions and role-based access control.',
  },
  {
    icon: HiOutlineChartBar,
    title: 'Election oversight',
    description:
      'Manage elections, ballots, and results from a centralized dashboard built for election officers.',
  },
  {
    icon: HiOutlineUserGroup,
    title: 'Voter participation',
    description:
      'Enable verified voters to participate in elections through a transparent, auditable platform.',
  },
];

export default function Home() {
  const { isAuthenticated, role } = useAuth();
  const dashboardPath = role ? getDashboardPathForRole(role) : ROUTES.LOGIN;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
              <HiOutlineShieldCheck className="h-5 w-5" aria-hidden="true" />
              Secure Online Election Platform
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Trusted election management for modern democracies
            </h1>

            <p className="mt-6 text-lg text-primary-100 sm:text-xl">
              Run secure, transparent elections with role-based access, real-time
              oversight, and voter-verified participation.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isAuthenticated ? (
                <Link to={dashboardPath}>
                  <Button size="lg" className="min-w-[180px]">
                    Go to dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to={ROUTES.SIGNUP}>
                    <Button size="lg" className="min-w-[180px]">
                      Create account
                    </Button>
                  </Link>
                  <Link to={ROUTES.LOGIN}>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="min-w-[180px] border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Built for security and transparency
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every component is designed to protect election integrity while
            keeping the experience simple for administrators and voters.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary-50 p-3 text-primary-600">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
