import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId } from '@/lib/db';
import { APP_VERSION } from '@/lib/version';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'sync_lock')
      .maybeSingle();

    if (error) throw error;

    if (data) {
      const updatedAt = new Date(data.updated_at).getTime();
      const now = Date.now();
      const ageInSeconds = (now - updatedAt) / 1000;

      if (ageInSeconds < 30) {
        return NextResponse.json({ locked: true, by: data.value, version: APP_VERSION });
      }
    }

    return NextResponse.json({ locked: false, version: APP_VERSION });
  } catch (error: any) {
    console.error('GET sync lock error:', error);
    return NextResponse.json({ error: 'Gagal mengecek status lock.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Guard: hanya Mentor Utama (Fajrin)
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { action, holder } = await request.json();

    if (!action || !holder) {
      return NextResponse.json({ error: 'Input tidak valid.' }, { status: 400 });
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

    const now = Date.now();
    let isLocked = false;
    let lockedBy = '';

    if (currentLock) {
      const updatedAt = new Date(currentLock.updated_at).getTime();
      const ageInSeconds = (now - updatedAt) / 1000;
      if (ageInSeconds < 30) {
        isLocked = true;
        lockedBy = currentLock.value;
      }
    }

    if (action === 'acquire') {
      if (isLocked && lockedBy !== holder && !isMentor) {
        return NextResponse.json({ success: false, lockedBy });
      }

      const { error: upsertErr } = await supabase
        .from('system_settings')
        .upsert({
          key: 'sync_lock',
          value: holder,
          updated_at: new Date().toISOString()
        });

      if (upsertErr) throw upsertErr;
      return NextResponse.json({ success: true });
    }

    if (action === 'heartbeat') {
      if (isLocked && lockedBy !== holder) {
        return NextResponse.json({ success: false, lockedBy });
      }

      const { error: updateErr } = await supabase
        .from('system_settings')
        .update({ updated_at: new Date().toISOString() })
        .eq('key', 'sync_lock')
        .eq('value', holder);

      if (updateErr) throw updateErr;
      return NextResponse.json({ success: true });
    }

    if (action === 'release') {
      if (currentLock && currentLock.value === holder) {
        const { error: deleteErr } = await supabase
          .from('system_settings')
          .delete()
          .eq('key', 'sync_lock');

        if (deleteErr) throw deleteErr;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action tidak dikenal.' }, { status: 400 });
  } catch (error: any) {
    console.error('POST sync lock error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status lock.' }, { status: 500 });
  }
}
