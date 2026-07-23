import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';

// Server-only client (service_role). Never imported at runtime by client
// components — they only import the types below, which are erased at compile.
// ponytail: single shared client, no connection pool tuning until it matters.
export const supabase = createClient(
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

// === SESSION COOKIE (Layer 1) ===
const SESSION_COOKIE_NAME = 'arcade_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 hari

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET not set in env');
  return secret;
}

function signSession(payload: string): string {
  const secret = getSessionSecret();
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(signed: string): string | null {
  try {
    const [payload, signature] = signed.split('.');
    if (!payload || !signature) return null;
    const expected = signSession(payload);
    if (!timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(participantId: string): string {
  const payload = JSON.stringify({ id: participantId, iat: Date.now() });
  return signSession(payload);
}

export function getSessionCookie(participantId: string): string {
  const token = createSessionToken(participantId);
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSessionParticipantId(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map(c => c.trim());
  const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!sessionCookie) return null;
  const token = sessionCookie.split('=')[1];
  const payload = verifySession(token);
  if (!payload) return null;
  try {
    const data = JSON.parse(payload);
    return data.id;
  } catch {
    return null;
  }
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

// === IN-MEMORY CACHE TO PREVENT SUPABASE EGRESS OVERFLOW ===
let cachedSkillBadges: { data: SkillBadge[]; expiresAt: number } | null = null;
let cachedSkillBadgesPromise: Promise<SkillBadge[]> | null = null;
let cachedParticipants: { data: Participant[]; expiresAt: number } | null = null;

const SKILLS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
const PARTICIPANTS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 menit

export function invalidateParticipantsCache() {
  cachedParticipants = null;
}

export async function getSkillBadges(): Promise<SkillBadge[]> {
  const now = Date.now();
  if (cachedSkillBadges && cachedSkillBadges.expiresAt > now) {
    return cachedSkillBadges.data;
  }
  if (cachedSkillBadgesPromise) {
    return cachedSkillBadgesPromise;
  }

  cachedSkillBadgesPromise = (async () => {
    try {
      const { data, error } = await supabase.from('skill_badges').select('*');
      if (error) throw error;
      const skills = data ?? [];
      cachedSkillBadges = { data: skills, expiresAt: Date.now() + SKILLS_CACHE_TTL_MS };
      return skills;
    } finally {
      cachedSkillBadgesPromise = null;
    }
  })();

  return cachedSkillBadgesPromise;
}

export async function getParticipants(): Promise<Participant[]> {
  const now = Date.now();
  if (cachedParticipants && cachedParticipants.expiresAt > now) {
    return cachedParticipants.data;
  }

  let allParticipants: Participant[] = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .range(from, from + limit - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allParticipants = allParticipants.concat(data);
    if (data.length < limit) break;
    from += limit;
  }

  cachedParticipants = { data: allParticipants, expiresAt: now + PARTICIPANTS_CACHE_TTL_MS };
  return allParticipants;
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
  invalidateParticipantsCache();
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
  invalidateParticipantsCache();
  const { data, error } = await supabase
    .from('participants').update(updates).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
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

export interface FacilitatorMember {
  id: string;
  facilitator_id: string;
  name: string;
  email?: string | null;
  profile_url: string;
  games_count: number;
  skills_count: number;
  monthly_points: number;
  last_synced?: string | null;
  created_at: string;
  created_by_batch_id?: string | null;
  sync_status?: 'belum' | 'sukses' | 'gagal' | 'pending';
}

export async function getFacilitatorMembers(facilitatorId: string): Promise<FacilitatorMember[]> {
  let allMembers: FacilitatorMember[] = [];
  let from = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('facilitator_members')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .range(from, from + limit - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allMembers = allMembers.concat(data);
    if (data.length < limit) break;
    from += limit;
  }

  return allMembers;
}

export async function getFacilitatorMember(id: string): Promise<FacilitatorMember | null> {
  const { data, error } = await supabase
    .from('facilitator_members')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function bulkUpsertFacilitatorMembers(
  facilitatorId: string,
  members: { name: string; email?: string; profile_url: string; games_count: number; skills_count: number; monthly_points: number }[],
  filename?: string
): Promise<FacilitatorMember[]> {
  // Deduplicate input members by profile_url to ensure idempotency
  const seenUrls = new Set<string>();
  const uniqueMembers = members.filter(m => {
    const normUrl = normalizeProfileUrl(m.profile_url) || m.profile_url;
    if (seenUrls.has(normUrl)) return false;
    seenUrls.add(normUrl);
    return true;
  });

  // Fetch all existing members for this facilitator first
  const existingMembers = await getFacilitatorMembers(facilitatorId);
  const existingMap = new Map(
    existingMembers.map(m => [normalizeProfileUrl(m.profile_url) || m.profile_url, m])
  );

  let batchId: string | null = null;
  if (filename) {
    // Check if duplicate upload with exact same filename and record count already exists for this facilitator
    const { data: existingUpload } = await supabase
      .from('upload_history')
      .select('id, filename, uploaded_at')
      .eq('facilitator_id', facilitatorId)
      .eq('filename', filename)
      .eq('records_count', uniqueMembers.length)
      .eq('status', 'completed')
      .maybeSingle();

    if (existingUpload) {
      const err: any = new Error(`File '${filename}' dengan ${uniqueMembers.length} data sudah pernah diunggah sebelumnya.`);
      err.isDuplicate = true;
      throw err;
    }

    const { data: batchData, error: batchErr } = await supabase
      .from('upload_history')
      .insert({
        facilitator_id: facilitatorId,
        filename,
        records_count: uniqueMembers.length,
        status: 'completed'
      })
      .select('id')
      .single();

    if (batchErr) throw batchErr;
    batchId = batchData?.id || null;
  }

  const rows = uniqueMembers.map(m => {
    const normUrl = normalizeProfileUrl(m.profile_url) || m.profile_url;
    const existing = existingMap.get(normUrl);

    if (existing) {
      // Preserve existing live scraped statistics and timestamps
      return {
        id: existing.id,
        facilitator_id: facilitatorId,
        name: m.name || existing.name,
        email: m.email || existing.email,
        profile_url: normUrl,
        games_count: existing.games_count,
        skills_count: existing.skills_count,
        monthly_points: existing.monthly_points,
        last_synced: existing.last_synced,
        created_by_batch_id: existing.created_by_batch_id,
        sync_status: existing.sync_status || 'belum'
      };
    } else {
      // New member: initialize counts to 0 and last_synced to null
      return {
        id: randomUUID(),
        facilitator_id: facilitatorId,
        name: m.name || 'Google Cloud Learner',
        email: m.email || null,
        profile_url: normUrl,
        games_count: 0,
        skills_count: 0,
        monthly_points: 0,
        last_synced: null,
        created_by_batch_id: batchId,
        sync_status: 'belum'
      };
    }
  });

  const { data, error } = await supabase
    .from('facilitator_members')
    .upsert(rows, { onConflict: 'facilitator_id,profile_url' })
    .select();

  if (error) throw error;

  if (filename && batchId) {
    await createAuditLog(facilitatorId, 'Upload CSV', {
      filename,
      count: uniqueMembers.length,
      batch_id: batchId
    });
  }

  return data ?? [];
}

export async function updateFacilitatorMember(
  id: string,
  updates: Partial<FacilitatorMember>
): Promise<FacilitatorMember | null> {
  const { data, error } = await supabase
    .from('facilitator_members')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;

  if (data && data.profile_url && typeof data.monthly_points === 'number') {
    // Sinkronkan ke tabel participants (Leaderboard Utama)
    try {
      await supabase
        .from('participants')
        .update({
          monthly_points: data.monthly_points,
          last_synced: data.last_synced || new Date().toISOString()
        })
        .ilike('profile_url', data.profile_url);
    } catch {}
  }

  return data;
}

export async function deleteFacilitatorMember(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('facilitator_members')
    .delete({ count: 'exact' })
    .eq('id', id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createAuditLog(
  actorId: string | null,
  action: string,
  details?: any
): Promise<void> {
  let actorName = 'System';
  if (actorId) {
    const { data } = await supabase
      .from('participants')
      .select('name')
      .eq('id', actorId)
      .maybeSingle();
    if (data?.name) {
      actorName = data.name;
    }
  }

  await supabase.from('audit_logs').insert({
    actor_id: actorId,
    actor_name: actorName,
    action,
    details
  });
}


