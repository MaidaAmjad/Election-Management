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

export function getMfaErrorMessage(error) {
  const message = error?.message ?? '';

  if (message.includes('expired') || message.includes('invalid')) {
    return 'Invalid or expired code. Request a new code and try again.';
  }

  return message || 'Verification failed. Please try again.';
}
