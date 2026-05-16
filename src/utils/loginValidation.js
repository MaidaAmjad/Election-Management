import { isValidEmail } from './validators';

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
    return 'Invalid email or password. Please try again.';
  }

  if (message.includes('Email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  return message || 'Failed to sign in. Please try again.';
}
