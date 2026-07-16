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
export const ACTIVE_PERIOD_START = '2026-07-13';

export function normalizeProfileUrl(url: string): string | null {
  const trimmed = url.trim();
  if ((trimmed.match(/https?:\/\//gi) || []).length > 1) {
    return null;
  }
  const match = trimmed.match(/(?:skills\.google|cloudskillsboost\.google)\/public_profiles\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (!match) return null;
  return `https://www.skills.google/public_profiles/${match[1].toLowerCase()}`;
}

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

export async function setBadges(
  participantId: string,
  newBadges: Omit<Badge, 'id' | 'participant_id' | 'scraped_at'>[]
): Promise<number> {
  // Hapus semua badge lama milik peserta ini dari database agar sinkronisasi bersih
  const { error: deleteErr } = await supabase
    .from('badges').delete().eq('participant_id', participantId);
  if (deleteErr) throw deleteErr;

  const current = newBadges.filter(b => b.earned_date >= ACTIVE_PERIOD_START);

  if (current.length > 0) {
    const rows = current.map(b => ({ ...b, participant_id: participantId }));
    const { error } = await supabase
      .from('badges').insert(rows);
    if (error) throw error;
  }

  const games = current.filter(b => b.category === 'game').length;
  const skills = current.filter(b => b.category === 'skill_badge').length;
  const monthlyPoints = games + skills * 0.5;

  const { error: updErr } = await supabase
    .from('participants').update({ monthly_points: monthlyPoints }).eq('id', participantId);
  if (updErr) throw updErr;

  return monthlyPoints;
}
