import { supabase } from '../supabase/supabase';
import { CREATOR_REQUEST_STATUS } from '../utils/adminConstants';
import { ELECTION_APPROVAL_STATUS } from '../utils/electionApprovalConstants';
import { getEffectiveStatus } from '../utils/electionStatus';

async function attachCreatorNames(elections) {
  if (!elections?.length) return [];

  const creatorIds = [...new Set(elections.map((e) => e.creator_id))];
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', creatorIds);

  if (error) throw error;

  const nameMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );

  return elections.map((election) => ({
    ...election,
    creator_name: nameMap[election.creator_id] ?? 'Unknown',
    effectiveStatus: getEffectiveStatus(election),
  }));
}

export async function fetchApprovedCreatorElections() {
  const { data: approvedCreators, error: creatorsError } = await supabase
    .from('creator_requests')
    .select('user_id')
    .eq('status', CREATOR_REQUEST_STATUS.APPROVED);

  if (creatorsError) throw creatorsError;

  const creatorIds = [...new Set((approvedCreators ?? []).map((r) => r.user_id))];

  if (creatorIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('elections')
    .select('*')
    .in('creator_id', creatorIds)
    .eq('approval_status', ELECTION_APPROVAL_STATUS.APPROVED)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachCreatorNames(data ?? []);
}

export async function fetchAdminElectionById(electionId) {
  const { data, error } = await supabase
    .from('elections')
    .select('*, polls(*)')
    .eq('id', electionId)
    .single();

  if (error) throw error;

  const { polls, ...election } = data;
  const [withName] = await attachCreatorNames([election]);

  return {
    ...withName,
    polls: polls ?? [],
  };
}
