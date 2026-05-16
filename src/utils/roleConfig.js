import {
  HiOutlineShieldCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
} from 'react-icons/hi2';
import { USER_ROLES } from './constants';

export const ROLE_OPTIONS = [
  {
    role: USER_ROLES.SUPER_ADMIN,
    title: 'Super Admin',
    description: 'Manage users, approvals, and system activities.',
    icon: HiOutlineShieldCheck,
    signupAllowed: false,
    accent: 'from-violet-500 to-purple-700',
    ring: 'ring-violet-500',
  },
  {
    role: USER_ROLES.ELECTION_CREATOR,
    title: 'Election Creator',
    description: 'Create elections, manage candidates, and monitor voting.',
    icon: HiOutlineClipboardDocumentList,
    signupAllowed: true,
    accent: 'from-primary-500 to-primary-700',
    ring: 'ring-primary-500',
  },
  {
    role: USER_ROLES.VOTER,
    title: 'Voter',
    description: 'Participate in elections and cast votes securely.',
    icon: HiOutlineUserGroup,
    signupAllowed: true,
    accent: 'from-emerald-500 to-teal-700',
    ring: 'ring-emerald-500',
  },
];

export function getRoleOption(role) {
  return ROLE_OPTIONS.find((option) => option.role === role) ?? null;
}
