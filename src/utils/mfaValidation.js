export function validateOtpCode(otp) {
  const errors = {};
  const trimmed = otp?.trim() ?? '';

  if (!trimmed) {
    errors.otp = 'Enter the 6-digit code from your email.';
  } else if (!/^\d{6}$/.test(trimmed)) {
    errors.otp = 'Enter a valid 6-digit code.';
  }

  return errors;
}

export function isEmailRateLimitError(error) {
  const message = error?.message?.toLowerCase() ?? '';
  return message.includes('rate limit') || message.includes('too many');
}

export function getEmailRateLimitMessage() {
  return 'Too many emails were sent recently. Please wait a few minutes and try again.';
}

export function getMfaErrorMessage(error) {
  const message = error?.message ?? '';

  if (isEmailRateLimitError(error)) {
    return getEmailRateLimitMessage();
  }

  if (message.includes('Invalid or expired')) {
    return 'Invalid or expired verification code. Request a new code and try again.';
  }

  return message || 'Verification failed. Please try again.';
}
