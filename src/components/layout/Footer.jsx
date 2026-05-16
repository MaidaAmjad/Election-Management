import { APP_NAME } from '../../utils/constants';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-slate-500">
          &copy; {year} {APP_NAME}. Secure online election platform.
        </p>
      </div>
    </footer>
  );
}
