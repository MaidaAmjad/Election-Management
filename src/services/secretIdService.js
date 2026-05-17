import { supabase } from '../supabase/supabase';
import { invokeEmailService } from './emailService';

export async function generateSecretIdsForElection(electionId) {
  const { data, error } = await supabase.rpc('generate_secret_ids_for_election', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return data;
}

export async function regenerateSecretId(secretRowId) {
  const { data, error } = await supabase.rpc('regenerate_secret_id', {
    p_secret_row_id: secretRowId,
  });
  if (error) throw error;
  return data;
}

export async function fetchMaskedSecretIdsForElection(electionId) {
  const { data, error } = await supabase.rpc('get_masked_secret_ids_for_election', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchMyMaskedSecretIds() {
  const { data, error } = await supabase.rpc('get_my_masked_secret_ids');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function fetchSecretLogsForElection(electionId) {
  const { data, error } = await supabase.rpc('get_secret_logs_for_election', {
    p_election_id: electionId,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function sendSecretIdEmail(secretRowId) {
  return invokeEmailService({
    action: 'secret_id_send',
    secret_row_id: secretRowId,
  });
}

export async function sendAllSecretIdEmails(electionId) {
  return invokeEmailService({
    action: 'secret_id_send_all',
    election_id: electionId,
  });
}

export async function logSecretIdViewed(electionId, pollId) {
  const { error } = await supabase.from('secret_logs').insert({
    user_id: (await supabase.auth.getUser()).data.user?.id,
    election_id: electionId,
    poll_id: pollId ?? null,
    action: 'ID viewed',
  });
  if (error) console.error('[SecretLog]', error.message);
}

export async function fetchElectionsForSecretIdManagement({ creatorId, isAdmin }) {
  let query = supabase
    .from('elections')
    .select('id, title, registration_status, finalized_at, creator_id')
    .eq('registration_status', 'Finalized')
    .order('finalized_at', { ascending: false });

  if (!isAdmin && creatorId) {
    query = query.eq('creator_id', creatorId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function countSecretIdsForElection(electionId) {
  const { count, error } = await supabase
    .from('secret_ids')
    .select('*', { count: 'exact', head: true })
    .eq('election_id', electionId)
    .eq('is_active', true);

  if (error) throw error;
  return count ?? 0;
}
