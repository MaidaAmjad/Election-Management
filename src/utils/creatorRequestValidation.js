export function validateCreatorRequestFields({ purpose, organization }) {
  const errors = {};

  if (!purpose?.trim()) {
    errors.purpose = 'Purpose of election is required.';
  } else if (purpose.trim().length < 10) {
    errors.purpose = 'Please provide at least 10 characters describing your purpose.';
  }

  if (!organization?.trim()) {
    errors.organization = 'Organization name is required.';
  }

  return errors;
}

export function validateRejectionReason(reason) {
  const errors = {};
  if (!reason?.trim()) {
    errors.rejectionReason = 'Rejection reason is required.';
  } else if (reason.trim().length < 5) {
    errors.rejectionReason = 'Please provide a meaningful rejection reason.';
  }
  return errors;
}
