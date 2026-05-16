import { isValidEmail } from './validators';
import {
  getEmailRateLimitMessage,
  isEmailRateLimitError,
} from './mfaValidation';

export function validateLoginForm({ email, password }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export function getAuthErrorMessage(error) {
  const message = error?.message ?? '';

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Use Forgot password below to set a new password for this email.';
  }

  if (isEmailRateLimitError(error)) {
    return getEmailRateLimitMessage();
  }

  return message || 'Failed to sign in. Please try again.';
}
