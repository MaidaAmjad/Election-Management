const OTP_REGEX = /^\d{6}$/;

export function validateOtpCode(code) {
  const errors = {};

  if (!code.trim()) {
    errors.otp = 'Verification code is required.';
  } else if (!OTP_REGEX.test(code.trim())) {
    errors.otp = 'Enter the 6-digit code from your email.';
  }

  return errors;
}

export function isEmailRateLimitError(error) {
  const message = (error?.message ?? '').toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    error?.status === 429
  );
}

export function getEmailRateLimitMessage() {
  return 'Too many emails were sent recently. Wait about an hour, then try again—or disable email 2FA in Settings if you enabled it.';
}

export function getMfaErrorMessage(error) {
  const message = error?.message ?? '';

  if (isEmailRateLimitError(error)) {
    return getEmailRateLimitMessage();
  }

  if (message.includes('expired') || message.includes('invalid')) {
    return 'Invalid or expired code. Request a new code and try again.';
  }

  return message || 'Verification failed. Please try again.';
}
