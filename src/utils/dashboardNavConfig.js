import {
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineHandRaised,
} from 'react-icons/hi2';
import { ROUTES, USER_ROLES } from './constants';

export const DASHBOARD_NAV = {
  [USER_ROLES.SUPER_ADMIN]: [
    { label: 'Dashboard', to: ROUTES.ADMIN_DASHBOARD, icon: HiOutlineHome, end: true },
    { label: 'Creator requests', to: ROUTES.ADMIN_REQUESTS, icon: HiOutlineUserGroup },
    {
      label: 'Election requests',
      to: ROUTES.ADMIN_ELECTION_REQUESTS,
      icon: HiOutlineClipboardDocumentList,
    },
    { label: 'Approved elections', to: ROUTES.ADMIN_APPROVED_ELECTIONS, icon: HiOutlineDocumentText },
    { label: 'Finalized Voters', to: ROUTES.ADMIN_FINALIZED_VOTERS, icon: HiOutlineUsers },
    { label: 'Secret IDs', to: ROUTES.ADMIN_SECRET_IDS, icon: HiOutlineKey },
    { label: 'Results', to: ROUTES.ADMIN_RESULTS, icon: HiOutlineChartBar },
    { label: 'Notifications', to: ROUTES.ADMIN_NOTIFICATIONS, icon: HiOutlineBell },
    { label: 'Settings', to: ROUTES.SETTINGS, icon: HiOutlineCog6Tooth },
  ],
  [USER_ROLES.ELECTION_CREATOR]: [
    { label: 'Dashboard', to: ROUTES.CREATOR_DASHBOARD, icon: HiOutlineHome, end: true },
    { label: 'My Elections', to: ROUTES.CREATOR_ELECTIONS, icon: HiOutlineDocumentText },
    { label: 'Secret IDs', to: ROUTES.CREATOR_SECRET_IDS, icon: HiOutlineKey },
    { label: 'Results', to: ROUTES.CREATOR_RESULTS, icon: HiOutlineChartBar },
    { label: 'Notifications', to: ROUTES.CREATOR_NOTIFICATIONS, icon: HiOutlineBell },
    { label: 'Settings', to: ROUTES.SETTINGS, icon: HiOutlineCog6Tooth },
  ],
  [USER_ROLES.VOTER]: [
    { label: 'Dashboard', to: ROUTES.VOTER_DASHBOARD, icon: HiOutlineHome, end: true },
    { label: 'Joined Polls', to: ROUTES.VOTER_JOINED_ELECTIONS, icon: HiOutlineDocumentText },
    { label: 'Voting History', to: ROUTES.VOTER_VOTING_HISTORY, icon: HiOutlineHandRaised },
    { label: 'Results', to: ROUTES.VOTER_RESULTS, icon: HiOutlineChartBar },
    { label: 'Notifications', to: ROUTES.VOTER_NOTIFICATIONS, icon: HiOutlineBell },
    { label: 'Settings', to: ROUTES.SETTINGS, icon: HiOutlineCog6Tooth },
  ],
};
