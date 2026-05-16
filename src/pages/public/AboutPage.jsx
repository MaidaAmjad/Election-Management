import { HiOutlineShieldCheck } from 'react-icons/hi2';
import { APP_NAME } from '../../utils/constants';

export default function AboutPage() {
  return (
    <div className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 text-primary-700">
          <HiOutlineShieldCheck className="h-10 w-10" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-slate-900">About {APP_NAME}</h1>
        </div>

        <div className="prose prose-slate mt-8 max-w-none">
          <p className="text-lg leading-relaxed text-slate-600">
            {APP_NAME} is a secure online election management platform designed
            for schools, organizations, clubs, and communities that need
            transparent, auditable digital voting.
          </p>
          <p className="mt-4 leading-relaxed text-slate-600">
            Election creators publish ballots with clear schedules and
            registration deadlines. Voters register, participate when voting
            opens, and trust that results are counted fairly. Super Admins
            oversee creator approvals and platform activity.
          </p>
          <h2 className="mt-10 text-xl font-semibold text-slate-900">
            Our principles
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-600">
            <li>Security through authentication, roles, and optional MFA</li>
            <li>Transparency with public election listings and live counts</li>
            <li>Privacy for individual ballots with aggregate visibility</li>
            <li>Accessibility on any device with a responsive experience</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
