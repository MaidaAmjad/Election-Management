import { getRoleOption } from '../../utils/roleConfig';

export default function SelectedRoleBanner({ role, mode = 'login' }) {
  const option = getRoleOption(role);

  if (!option) return null;

  const label = mode === 'signup' ? 'Signing up as' : 'Logging in as';

  return (
    <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-center">
      <p className="text-sm text-slate-600">
        {label}:{' '}
        <span className="font-semibold text-primary-800">{option.title}</span>
      </p>
    </div>
  );
}
