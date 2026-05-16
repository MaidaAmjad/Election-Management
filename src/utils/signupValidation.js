import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  passwordsMatch,
} from './validators';

export function validateSignupForm({
  fullName,
  email,
  phone,
  password,
  confirmPassword,
}) {
  const errors = {};

  if (!fullName.trim()) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  }

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Enter a valid phone number (10–15 digits).';
  }

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
