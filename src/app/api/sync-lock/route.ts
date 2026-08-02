import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId, getSessionCookie } from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';
const FAJRIN_URL = 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c';

export async function GET() {
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .in('key', ['sync_lock', 'maintenance_mode']);

    if (error) throw error;

    const lockSetting = settings?.find(s => s.key === 'sync_lock');
    const maintenanceSetting = settings?.find(s => s.key === 'maintenance_mode');

    const maintenance = maintenanceSetting?.value === 'true';
    let locked = false;
    let by = '';

    if (lockSetting) {
      locked = true;
      by = lockSetting.value;
    }

    return NextResponse.json({ locked, by, maintenance, version: APP_VERSION }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    });
  } catch (error: any) {
    console.error('GET sync lock error:', error);
    return NextResponse.json({ error: 'Gagal mengecek status lock.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, holder } = await request.json();

    if (!action || !holder) {
      return NextResponse.json({ error: 'Input tidak valid.' }, { status: 400 });
    }

    const sessionUserId = getSessionParticipantId(request);
    let isAuthed = sessionUserId === FAJRIN_ID;
    let shouldSetCookie = false;

    // Fallback: auto-auth Fajrin via DB check if cookie is missing
    if (!isAuthed && holder === 'Mentor Utama') {
      const { data: user } = await supabase
        .from('participants')
        .select('id, profile_url')
        .eq('id', FAJRIN_ID)
        .maybeSingle();

      if (user && user.profile_url === FAJRIN_URL) {
        isAuthed = true;
        shouldSetCookie = true;
      }
    }

    if (!isAuthed) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (action === 'acquire' || action === 'heartbeat') {
      if (holder !== 'Mentor Utama') {
        return NextResponse.json({ success: false, error: 'Hanya Mentor Utama yang dapat mengunci sistem.' });
      }
    }

    const isMentor = holder === 'Mentor Utama';

    const { data: currentLock, error: getErr } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'sync_lock')
      .maybeSingle();

    if (getErr) throw getErr;

    let isLocked = false;
    let lockedBy = '';

    if (currentLock) {
      isLocked = true;
      lockedBy = currentLock.value;
    }

    const jsonResponse = (data: any, status = 200) => {
      if (shouldSetCookie) {
        return NextResponse.json(data, { status, headers: { 'Set-Cookie': getSessionCookie(FAJRIN_ID) } });
      }
      return NextResponse.json(data, { status });
    };

    if (action === 'acquire') {
      if (isLocked && lockedBy !== holder && !isMentor) {
        return jsonResponse({ success: false, lockedBy });
      }

      const { error: upsertErr } = await supabase
        .from('system_settings')
        .upsert({
          key: 'sync_lock',
          value: holder,
          updated_at: new Date().toISOString()
        });

      if (upsertErr) throw upsertErr;
      return jsonResponse({ success: true });
    }

    if (action === 'heartbeat') {
      if (isLocked && lockedBy !== holder) {
        return jsonResponse({ success: false, lockedBy });
      }

      const { error: updateErr } = await supabase
        .from('system_settings')
        .update({ updated_at: new Date().toISOString() })
        .eq('key', 'sync_lock')
        .eq('value', holder);

      if (updateErr) throw updateErr;
      return jsonResponse({ success: true });
    }

    if (action === 'release') {
      if (currentLock && currentLock.value === holder) {
        const { error: deleteErr } = await supabase
          .from('system_settings')
          .delete()
          .eq('key', 'sync_lock');

        if (deleteErr) throw deleteErr;
      }
      return jsonResponse({ success: true });
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 });
  } catch (error: any) {
    console.error('POST sync lock error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status lock.' }, { status: 500 });
  }
}
