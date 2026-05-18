import { ELECTION_CATEGORIES } from './electionConstants';
import { getDisplayPolls, isStagingPoll } from './pollCandidatesLoader';

export const emptyPoll = ({ isStaging = false } = {}) => ({
  id: crypto.randomUUID(),
  title: '',
  description: '',
  allowMultipleAnswers: false,
  optionCandidateIds: [],
  isNew: true,
  isStaging,
  candidates: [],
});

export const emptyCandidateDraft = () => ({
  id: crypto.randomUUID(),
  name: '',
  designation: '',
  manifesto: '',
  photo_url: '',
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
  polls: [],
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

export function validateApprovedElectionScheduleForm(
  form,
  {
    registrationDeadline,
    votingHasStarted = false,
    electionHasEnded = false,
    originalStartDatetime = null,
  } = {},
) {
  const errors = {};

  if (!form.start_datetime) {
    errors.start_datetime = 'Start date and time is required.';
  }

  if (!form.end_datetime) {
    errors.end_datetime = 'End date and time is required.';
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
  const regDeadline = registrationDeadline ? new Date(registrationDeadline) : null;

  if (start && end && start >= end) {
    errors.end_datetime = 'End date/time must be after start date/time.';
  }

  if (regDeadline && start && regDeadline >= start) {
    errors.start_datetime =
      'Start date/time must be after the registration deadline.';
  }

  if (
    votingHasStarted &&
    originalStartDatetime &&
    form.start_datetime &&
    form.start_datetime !== originalStartDatetime
  ) {
    errors.start_datetime = 'Start time cannot be changed after voting has begun.';
  }

  if (electionHasEnded && end && form.original_end_datetime) {
    const originalEnd = new Date(form.original_end_datetime);
    if (end < originalEnd) {
      errors.end_datetime = 'Cannot shorten the end time after the election has ended.';
    }
  }

  return errors;
}

export function validateElectionForm(form, { isPublish = false, includePolls = true } = {}) {
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
  if (!includePolls) {
    return errors;
  }

  const displayPolls = getDisplayPolls(form.polls);
  displayPolls.forEach((poll, index) => {
    const pollFieldErrors = {};
    if (!poll.title?.trim()) {
      pollFieldErrors.title = 'Question is required.';
    }
    const optionCount = poll.optionCandidateIds?.length ?? 0;
    if (optionCount < 2) {
      pollFieldErrors.options = 'Select at least two candidates as options.';
    }
    if (Object.keys(pollFieldErrors).length > 0) {
      pollErrors[index] = pollFieldErrors;
    }
  });

  if (Object.keys(pollErrors).length > 0) {
    errors.polls = pollErrors;
  }

  if (isPublish && displayPolls.length === 0) {
    errors.pollsGeneral = 'Add at least one poll before publishing.';
  }

  return errors;
}

/** Step 2: at least one saved candidate on the staging poll */
export function validateStagingCandidates(polls) {
  const staging = (polls ?? []).find((p) => isStagingPoll(p)) ?? polls?.[0];
  const count = staging?.candidates?.length ?? 0;
  if (count < 1) {
    return { candidatesGeneral: 'Add at least one candidate before continuing.' };
  }
  return {};
}

export function validateCandidatesForPublish(polls) {
  const errors = {};
  const displayPolls = getDisplayPolls(polls);
  if (!displayPolls.length) {
    return { pollsGeneral: 'Add at least one poll before publishing.' };
  }

  displayPolls.forEach((poll, index) => {
    const count = poll.optionCandidateIds?.length ?? poll.candidates?.length ?? 0;
    if (!poll.title?.trim()) return;
    if (count < 2) {
      errors[index] = 'Select at least two options for this poll.';
    }
  });

  if (Object.keys(errors).length > 0) {
    return { pollCandidates: errors };
  }
  return {};
}

export function hasValidationErrors(errors) {
  return Boolean(errors && Object.keys(errors).length > 0);
}

/** First user-facing validation message for toasts. */
export function getValidationErrorMessage(errors) {
  if (!hasValidationErrors(errors)) return null;
  if (errors.pollsGeneral) return errors.pollsGeneral;
  if (errors.candidatesGeneral) return errors.candidatesGeneral;
  if (errors.polls && typeof errors.polls === 'object') {
    for (const key of Object.keys(errors.polls)) {
      const pollErr = errors.polls[key];
      const n = Number(key) + 1;
      if (pollErr?.title) return `Poll ${n}: ${pollErr.title}`;
      if (pollErr?.options) return `Poll ${n}: ${pollErr.options}`;
    }
  }
  const skip = new Set(['polls', 'pollsGeneral', 'candidatesGeneral', 'pollCandidates']);
  const first = Object.keys(errors).find((k) => !skip.has(k));
  if (first && errors[first]) return errors[first];
  return 'Fix the highlighted errors before continuing.';
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
            allowMultipleAnswers: Boolean(
              p.allowMultipleAnswers ?? p.allow_multiple_answers,
            ),
            optionCandidateIds: p.optionCandidateIds ?? (p.candidates ?? []).map((c) => c.id),
            isNew: false,
            isStaging: isStagingPoll({
              ...p,
              isStaging: p.isStaging ?? p.is_staging,
            }),
            candidates: (p.candidates ?? []).map((c) => ({
              id: c.id,
              name: c.name ?? '',
              designation: c.designation ?? '',
              manifesto: c.manifesto ?? '',
              photo_url: c.photo_url ?? '',
              poll_id: c.poll_id ?? p.id,
              isNew: false,
            })),
          }))
        : [],
  };
}

export const WIZARD_STEPS = {
  DETAILS: 1,
  CANDIDATES: 2,
  POLLS: 3,
};

export const WIZARD_STEP_LABELS = [
  'Election details',
  'Add candidates',
  'Create polls',
];
