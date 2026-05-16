const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

export function normalizePhone(phone) {
  return phone.replace(/[\s\-().]/g, '');
}

export function isValidPhone(phone) {
  return PHONE_REGEX.test(normalizePhone(phone));
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password) {
  return password.length >= 8;
}

export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

export function getPasswordStrengthMessage(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Include at least one number.';
  }
  return null;
}
