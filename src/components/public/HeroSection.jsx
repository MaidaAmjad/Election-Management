import { Link } from 'react-router-dom';
import { HiOutlineArrowRight } from 'react-icons/hi2';
import Button from '../ui/Button';
import { ROUTES } from '../../utils/constants';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 text-white">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Secure Online Election Management System
          </h1>
          <p className="mt-6 text-lg text-primary-100 sm:text-xl">
            A secure and transparent online voting platform where users can
            create, participate, and manage elections.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to={ROUTES.CHOOSE_ROLE}>
              <Button size="lg" className="min-w-[200px] gap-2">
                Get Started
                <HiOutlineArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
            <Link to={ROUTES.PUBLIC_ELECTIONS}>
              <Button
                size="lg"
                variant="secondary"
                className="min-w-[200px] border-white/30 bg-white/10 text-white hover:bg-white/20"
              >
                Browse Elections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
