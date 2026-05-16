import { isValidEmail, isValidPassword, passwordsMatch } from './validators';

export function validateForgotPasswordForm({ email }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}

export function validateResetPasswordForm({ password, confirmPassword }) {
  const errors = {};

  if (!password) {
    errors.password = 'Password is required.';
  } else if (!isValidPassword(password)) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (!passwordsMatch(password, confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

export function getPasswordResetErrorMessage(error) {
  const message = error?.message ?? '';
  return message || 'Failed to send reset email. Please try again.';
}

export function getUpdatePasswordErrorMessage(error) {
  const message = error?.message ?? '';

  if (message.includes('same as')) {
    return 'New password must be different from your current password.';
  }

  return message || 'Failed to update password. Please try again.';
}
