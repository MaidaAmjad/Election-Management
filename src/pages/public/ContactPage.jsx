import {
  HiOutlineEnvelope,
  HiOutlineGlobeAlt,
  HiOutlinePhone,
} from 'react-icons/hi2';
import { APP_NAME } from '../../utils/constants';

export default function ContactPage() {
  return (
    <div className="bg-slate-50 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Contact us</h1>
        <p className="mt-4 text-lg text-slate-600">
          Questions about {APP_NAME}? Reach our support team using the details
          below.
        </p>

        <ul className="mt-10 space-y-6">
          <li className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <HiOutlineEnvelope className="mt-0.5 h-6 w-6 text-primary-600" />
            <div>
              <p className="font-semibold text-slate-900">Email</p>
              <a
                href="mailto:support@electionmanagement.app"
                className="text-primary-600 hover:underline"
              >
                support@electionmanagement.app
              </a>
            </div>
          </li>
          <li className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <HiOutlinePhone className="mt-0.5 h-6 w-6 text-primary-600" />
            <div>
              <p className="font-semibold text-slate-900">Phone</p>
              <p className="text-slate-600">+1 (555) 123-4567</p>
            </div>
          </li>
          <li className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <HiOutlineGlobeAlt className="mt-0.5 h-6 w-6 text-primary-600" />
            <div>
              <p className="font-semibold text-slate-900">Website</p>
              <p className="text-slate-600">www.electionmanagement.app</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
