import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId } from '@/lib/db';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';
const FAJRIN_URL = 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profile_id');

    if (!profileId) {
      return NextResponse.json({ error: 'Akses Ditolak.' }, { status: 403 });
    }

    // Guard: session harus Fajrin
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Double-check authorization on database
    const { data: user, error: userErr } = await supabase
      .from('participants')
      .select('id, profile_url')
      .eq('id', profileId)
      .single();

    if (userErr || !user || user.id !== FAJRIN_ID || user.profile_url !== FAJRIN_URL) {
      return NextResponse.json({ error: 'Akses Ditolak. Halaman ini hanya untuk pemilik proyek.' }, { status: 403 });
    }

    // 1. Total facilitator members count
    const { count: totalCount, error: totalErr } = await supabase
      .from('facilitator_members')
      .select('*', { count: 'exact', head: true });

    if (totalErr) throw totalErr;

    // 2. Unsynced count
    const { count: unsyncedCount, error: unsyncedErr } = await supabase
      .from('facilitator_members')
      .select('*', { count: 'exact', head: true })
      .is('last_synced', null);

    if (unsyncedErr) throw unsyncedErr;

    // 3. New participants in the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: recentErr } = await supabase
      .from('facilitator_members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    if (recentErr) throw recentErr;

    // 4. List of 50 most recently created unsynced members
    const { data: unsyncedList, error: unsyncedListErr } = await supabase
      .from('facilitator_members')
      .select('*, participants:facilitator_id(name)')
      .is('last_synced', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unsyncedListErr) throw unsyncedListErr;

    // 5. List of 50 most recently created members overall
    const { data: recentList, error: recentListErr } = await supabase
      .from('facilitator_members')
      .select('*, participants:facilitator_id(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (recentListErr) throw recentListErr;

    const unsyncedMapped = (unsyncedList || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      profile_url: m.profile_url,
      created_at: m.created_at,
      facilitator_name: m.participants?.name || 'Unknown'
    }));

    const recentMapped = (recentList || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      profile_url: m.profile_url,
      games_count: m.games_count,
      skills_count: m.skills_count,
      monthly_points: m.monthly_points,
      last_synced: m.last_synced,
      created_at: m.created_at,
      facilitator_name: m.participants?.name || 'Unknown'
    }));

    // 6. Get all unsynced IDs for unlimited sync mass loops
    const { data: allUnsyncedData, error: allUnsyncedErr } = await supabase
      .from('facilitator_members')
      .select('id')
      .is('last_synced', null);

    if (allUnsyncedErr) throw allUnsyncedErr;
    const allUnsyncedIds = (allUnsyncedData || []).map((m: any) => m.id);

    return NextResponse.json({
      stats: {
        total: totalCount || 0,
        unsynced: unsyncedCount || 0,
        recent24h: recentCount || 0
      },
      unsyncedList: unsyncedMapped,
      recentList: recentMapped,
      allUnsyncedIds
    });

  } catch (error: any) {
    console.error('GET admin monitor error:', error);
    return NextResponse.json({ error: 'Gagal memuat data monitoring.' }, { status: 500 });
  }
}
