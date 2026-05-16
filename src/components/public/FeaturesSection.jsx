import {
  HiOutlineEye,
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import { PUBLIC_FEATURES } from '../../utils/publicElectionConstants';

const icons = [
  HiOutlineLockClosed,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineUserGroup,
  HiOutlineEye,
];

export default function FeaturesSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for trust and transparency
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Everything you need to run secure digital elections from start to
            finish.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_FEATURES.map((feature, index) => {
            const Icon = icons[index] ?? HiOutlineShieldCheck;
            return (
              <article
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-slate-50/50 p-6 transition-all duration-300 hover:border-primary-200 hover:bg-white hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
