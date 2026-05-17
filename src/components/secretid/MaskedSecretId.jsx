import { maskSecretId, preventSecretIdCopy } from '../../utils/maskSecretId';

/**
 * Renders a masked secret ID only. Never pass or display the full secret_id.
 */
export default function MaskedSecretId({ maskedValue, className = '' }) {
  const display = maskedValue?.startsWith('****')
    ? maskedValue
    : maskSecretId(maskedValue);

  return (
    <span
      className={`font-mono text-sm tracking-wide text-slate-800 select-none ${className}`}
      onCopy={preventSecretIdCopy}
      onCut={preventSecretIdCopy}
      title="Secret ID is partially hidden for security"
    >
      {display}
    </span>
  );
}
