import { ELECTION_CATEGORIES } from './electionConstants';

export const PUBLIC_ELECTION_STATUS = {
  UPCOMING: 'Upcoming',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

export const PUBLIC_STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: PUBLIC_ELECTION_STATUS.UPCOMING, label: 'Upcoming' },
  { value: PUBLIC_ELECTION_STATUS.ACTIVE, label: 'Active' },
  { value: PUBLIC_ELECTION_STATUS.COMPLETED, label: 'Completed' },
];

export const PUBLIC_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_votes', label: 'Most votes' },
];

export const PUBLIC_CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  ...ELECTION_CATEGORIES.map((c) => ({ value: c, label: c })),
];

export const PUBLIC_FEATURES = [
  {
    title: 'Secure Voting',
    description:
      'Encrypted authentication and role-based access keep every ballot protected.',
  },
  {
    title: 'Real-Time Results',
    description:
      'Live vote counts update instantly so stakeholders see progress as it happens.',
  },
  {
    title: 'Anonymous Voting',
    description:
      'Individual choices stay private while totals remain fully transparent.',
  },
  {
    title: 'Role-Based Access',
    description:
      'Super Admins, Election Creators, and Voters each get tailored experiences.',
  },
  {
    title: 'Transparent Process',
    description:
      'Clear timelines, registration deadlines, and public election listings.',
  },
];
