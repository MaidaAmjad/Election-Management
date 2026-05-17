import { supabase } from '../supabase/supabase';
import { sendSecretIdsOnRegistration } from './notificationService';
import { VOTER_REGISTRATION_STATUS } from '../utils/voterRegistrationConstants';

const ACTIVE_STATUSES = [
  VOTER_REGISTRATION_STATUS.REGISTERED,
  VOTER_REGISTRATION_STATUS.APPROVED,
];

export async function fetchActiveRegistrationCount(electionId) {
  const { count, error } = await supabase
    .from('voter_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId)
    .in('status', ACTIVE_STATUSES);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchActiveRegistrationCountsByElectionIds(electionIds) {
  if (!electionIds.length) return {};

  const { data, error } = await supabase
    .from('voter_registrations')
    .select('election_id')
    .in('election_id', electionIds)
    .in('status', ACTIVE_STATUSES);

  if (error) throw error;

  const counts = {};
  (data ?? []).forEach((row) => {
    counts[row.election_id] = (counts[row.election_id] ?? 0) + 1;
  });
  return counts;
}

export async function fetchVoterRegistrationForElection(electionId, voterId) {
  if (!voterId) return null;

  const { data, error } = await supabase
    .from('voter_registrations')
    .select('id, election_id, voter_id, status, registered_at')
    .eq('election_id', electionId)
    .eq('voter_id', voterId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  let waitlistPosition = null;
  if (data.status === VOTER_REGISTRATION_STATUS.WAITLISTED) {
    waitlistPosition = await fetchWaitlistPosition(electionId, voterId);
  }

  return { ...data, waitlist_position: waitlistPosition };
}

export async function fetchWaitlistPosition(electionId, voterId) {
  if (!voterId) return null;

  const { data, error } = await supabase
    .from('waitlist')
    .select('position')
    .eq('election_id', electionId)
    .eq('voter_id', voterId)
    .maybeSingle();

  if (error) throw error;
  return data?.position ?? null;
}

export async function fetchVoterJoinedElections(voterId) {
  if (!voterId) return [];

  const { data, error } = await supabase
    .from('voter_registrations')
    .select(
      `
      id,
      election_id,
      status,
      registered_at,
      elections (
        id,
        title,
        status,
        start_datetime,
        end_datetime,
        registration_deadline,
        max_voters
      )
    `,
    )
    .eq('voter_id', voterId)
    .order('registered_at', { ascending: false });

  if (error) throw error;

  const registrations = data ?? [];
  const waitlisted = registrations.filter(
    (row) => row.status === VOTER_REGISTRATION_STATUS.WAITLISTED,
  );

  let waitlistByElection = {};
  if (waitlisted.length) {
    const electionIds = waitlisted.map((row) => row.election_id);
    const { data: waitlistRows, error: waitlistError } = await supabase
      .from('waitlist')
      .select('election_id, position')
      .eq('voter_id', voterId)
      .in('election_id', electionIds);

    if (waitlistError) throw waitlistError;

    waitlistByElection = Object.fromEntries(
      (waitlistRows ?? []).map((row) => [row.election_id, row.position]),
    );
  }

  return registrations.map((row) => ({
    id: row.id,
    election_id: row.election_id,
    status: row.status,
    registered_at: row.registered_at,
    waitlist_position: waitlistByElection[row.election_id] ?? null,
    election: row.elections,
  }));
}

export async function joinElection(electionId) {
  const { data, error } = await supabase.rpc('register_voter_for_election', {
    p_election_id: electionId,
  });

  if (error) throw error;

  if (data?.success) {
    if (data?.code === 'REGISTERED' || data?.status === 'Registered') {
      try {
        const emailResult = await sendSecretIdsOnRegistration({
          electionId,
          secretRowIds: data?.secret_row_ids,
          secretIdsIssued: data?.secret_ids_issued ?? null,
        });
        return {
          ...data,
          secret_email_sent: (emailResult?.sent ?? 0) > 0,
          secret_email_message: emailResult?.message ?? null,
        };
      } catch (emailErr) {
        return {
          ...data,
          secret_email_sent: false,
          secret_email_error:
            emailErr.message ?? 'Could not send Secret ID email.',
        };
      }
    }
  }

  return data;
}

export async function cancelVoterRegistration(electionId) {
  const { data, error } = await supabase.rpc('cancel_voter_registration', {
    p_election_id: electionId,
  });

  if (error) throw error;
  return data;
}

export function subscribeToVoterRegistrations(electionId, onChange) {
  const channel = supabase
    .channel(`voter-registrations-${electionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'voter_registrations',
        filter: `election_id=eq.${electionId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
