import { Link } from 'react-router-dom';
import {
  HiOutlineEnvelope,
  HiOutlineGlobeAlt,
  HiOutlinePhone,
} from 'react-icons/hi2';
import { FaFacebook, FaLinkedin, FaXTwitter } from 'react-icons/fa6';
import { APP_NAME, ROUTES } from '../../utils/constants';

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <h3 className="text-lg font-bold text-white">{APP_NAME}</h3>
          <p className="mt-3 text-sm leading-relaxed">
            Secure and transparent online elections for organizations,
            campuses, and communities.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-800 p-2 hover:bg-primary-600 hover:text-white"
              aria-label="Twitter"
            >
              <FaXTwitter className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-800 p-2 hover:bg-primary-600 hover:text-white"
              aria-label="LinkedIn"
            >
              <FaLinkedin className="h-5 w-5" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-slate-800 p-2 hover:bg-primary-600 hover:text-white"
              aria-label="Facebook"
            >
              <FaFacebook className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
            Quick links
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to={ROUTES.HOME} className="hover:text-white">
                Home
              </Link>
            </li>
            <li>
              <Link to={ROUTES.PUBLIC_ELECTIONS} className="hover:text-white">
                Elections
              </Link>
            </li>
            <li>
              <Link to={ROUTES.ABOUT} className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link to={ROUTES.CHOOSE_ROLE} className="hover:text-white">
                Login
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
            Contact
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <HiOutlineEnvelope className="h-4 w-4 shrink-0" />
              support@electionmanagement.app
            </li>
            <li className="flex items-center gap-2">
              <HiOutlinePhone className="h-4 w-4 shrink-0" />
              +1 (555) 123-4567
            </li>
            <li className="flex items-center gap-2">
              <HiOutlineGlobeAlt className="h-4 w-4 shrink-0" />
              www.electionmanagement.app
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-800 py-6 text-center text-sm">
        &copy; {year} {APP_NAME}. All rights reserved.
      </div>
    </footer>
  );
}

