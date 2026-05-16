import { ELECTION_CATEGORIES } from './electionConstants';

export const emptyPoll = () => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  isNew: true,
});

export const emptyElectionForm = () => ({
  title: '',
  description: '',
  category: '',
  start_datetime: '',
  end_datetime: '',
  registration_deadline: '',
  max_voters: '',
  polls: [emptyPoll()],
});

export function toDatetimeLocalValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function validateElectionForm(form, { isPublish = false } = {}) {
  const errors = {};

  if (!form.title?.trim()) {
    errors.title = 'Election title is required.';
  }

  if (!form.description?.trim()) {
    errors.description = 'Election description is required.';
  }

  if (!form.category?.trim()) {
    errors.category = 'Election category is required.';
  } else if (!ELECTION_CATEGORIES.includes(form.category)) {
    errors.category = 'Select a valid category.';
  }

  if (!form.start_datetime) {
    errors.start_datetime = 'Start date and time is required.';
  }

  if (!form.end_datetime) {
    errors.end_datetime = 'End date and time is required.';
  }

  if (!form.registration_deadline) {
    errors.registration_deadline = 'Registration deadline is required.';
  }

  if (!form.max_voters && form.max_voters !== 0) {
    errors.max_voters = 'Maximum voters is required.';
  } else {
    const maxVoters = Number(form.max_voters);
    if (!Number.isInteger(maxVoters) || maxVoters < 1) {
      errors.max_voters = 'Maximum voters must be at least 1.';
    }
  }

  const start = form.start_datetime ? new Date(form.start_datetime) : null;
  const end = form.end_datetime ? new Date(form.end_datetime) : null;
  const regDeadline = form.registration_deadline
    ? new Date(form.registration_deadline)
    : null;
  const now = new Date();

  if (start && end && start >= end) {
    errors.end_datetime = 'End date/time must be after start date/time.';
  }

  if (regDeadline && start && regDeadline >= start) {
    errors.registration_deadline =
      'Registration deadline must be before election start time.';
  }

  if (isPublish && start && start < now) {
    errors.start_datetime = 'Start date/time cannot be in the past.';
  }

  const pollErrors = {};
  (form.polls ?? []).forEach((poll, index) => {
    const pollFieldErrors = {};
    if (!poll.title?.trim()) {
      pollFieldErrors.title = 'Poll title is required.';
    }
    if (!poll.description?.trim()) {
      pollFieldErrors.description = 'Poll description is required.';
    }
    if (Object.keys(pollFieldErrors).length > 0) {
      pollErrors[index] = pollFieldErrors;
    }
  });

  if (Object.keys(pollErrors).length > 0) {
    errors.polls = pollErrors;
  }

  if (isPublish && (!form.polls || form.polls.length === 0)) {
    errors.pollsGeneral = 'Add at least one poll before publishing.';
  }

  return errors;
}

export function hasValidationErrors(errors) {
  if (!errors || Object.keys(errors).length === 0) return false;
  if (errors.polls && typeof errors.polls === 'object') {
    return (
      Object.keys(errors).length > 1 ||
      Object.keys(errors.polls).length > 0
    );
  }
  return true;
}

export function electionToForm(election, polls = []) {
  return {
    title: election.title ?? '',
    description: election.description ?? '',
    category: election.category ?? '',
    start_datetime: toDatetimeLocalValue(election.start_datetime),
    end_datetime: toDatetimeLocalValue(election.end_datetime),
    registration_deadline: toDatetimeLocalValue(
      election.registration_deadline,
    ),
    max_voters: String(election.max_voters ?? ''),
    polls:
      polls.length > 0
        ? polls.map((p) => ({
            id: p.id,
            title: p.title ?? '',
            description: p.description ?? '',
            isNew: false,
          }))
        : [emptyPoll()],
  };
}
