import { createClient } from '@supabase/supabase-js';

// Server-only client (service_role). Never imported at runtime by client
// components — they only import the types below, which are erased at compile.
// ponytail: single shared client, no connection pool tuning until it matters.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// ponytail: awal periode arcade berjalan. Hardcoded; ubah tiap ganti bulan.
export const ACTIVE_PERIOD_START = '2026-07-01';

export interface Participant {
  id: string;
  name: string;
  profile_url: string;
  avatar_url?: string;
  role: 'facilitator' | 'participant';
  last_synced?: string;
  created_at: string;
  // Derived at query time, not stored:
  monthly_points?: number;
}

export interface Badge {
  id: string;
  participant_id: string;
  badge_name: string;
  category: 'game' | 'skill_badge';
  points: number;
  earned_date: string;
  image_url?: string;
  scraped_at: string;
}

export interface SkillBadge {
  id: number;
  name: string;
  url: string;
  cost?: string;
  difficulty?: string;
  duration?: string;
  labs?: number;
  created_at?: string;
}

export async function getSkillBadges(): Promise<SkillBadge[]> {
  const { data, error } = await supabase.from('skill_badges').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function getParticipants(): Promise<Participant[]> {
  const { data, error } = await supabase.from('participants').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function getParticipant(id: string): Promise<Participant | null> {
  const { data, error } = await supabase.from('participants').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getParticipantByUrl(profileUrl: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants').select('*').ilike('profile_url', profileUrl).maybeSingle();
  if (error) throw error;
  return data;
}

export async function addParticipant(
  p: Pick<Participant, 'name' | 'profile_url' | 'role'>
): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .insert({ ...p, name: p.name || 'Google Cloud Learner' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateParticipant(
  id: string,
  updates: Partial<Participant>
): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteParticipant(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('participants').delete({ count: 'exact' }).eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getBadges(participantId?: string): Promise<Badge[]> {
  let q = supabase.from('badges').select('*');
  if (participantId) q = q.eq('participant_id', participantId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Simpan badge periode berjalan saja (hemat free tier), prune yang lama,
// lalu hitung & simpan monthly_points ke participant. Upsert on
// (participant_id, badge_name) supaya re-scrape tidak duplikat.
export async function setBadges(
  participantId: string,
  newBadges: Omit<Badge, 'id' | 'participant_id' | 'scraped_at'>[]
): Promise<number> {
  const current = newBadges.filter(b => b.earned_date >= ACTIVE_PERIOD_START);

  if (current.length > 0) {
    const rows = current.map(b => ({ ...b, participant_id: participantId }));
    const { error } = await supabase
      .from('badges').upsert(rows, { onConflict: 'participant_id,badge_name' });
    if (error) throw error;
  }

  // Buang badge di luar periode berjalan (mis. sisa scrape lama).
  const { error: pruneErr } = await supabase
    .from('badges').delete().eq('participant_id', participantId).lt('earned_date', ACTIVE_PERIOD_START);
  if (pruneErr) throw pruneErr;

  const games = current.filter(b => b.category === 'game').length;
  const skills = current.filter(b => b.category === 'skill_badge').length;
  const monthlyPoints = games + skills * 0.5;

  const { error: updErr } = await supabase
    .from('participants').update({ monthly_points: monthlyPoints }).eq('id', participantId);
  if (updErr) throw updErr;

  return monthlyPoints;
}
