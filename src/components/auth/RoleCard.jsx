import { HiOutlineCheckCircle } from 'react-icons/hi2';

export default function RoleCard({
  title,
  description,
  icon: Icon,
  accent,
  ring,
  selected,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative w-full rounded-2xl border-2 bg-white p-6 text-left shadow-sm transition-all duration-300',
        'hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        selected
          ? `${ring} border-transparent ring-2 ring-offset-2`
          : 'border-slate-200 hover:border-primary-300',
      ].join(' ')}
    >
      {selected && (
        <span className="absolute right-4 top-4 text-primary-600">
          <HiOutlineCheckCircle className="h-6 w-6" aria-hidden="true" />
        </span>
      )}

      <div
        className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${accent} p-3 text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>

      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </button>
  );
}
