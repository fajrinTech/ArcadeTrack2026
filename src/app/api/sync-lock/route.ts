import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

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

      // Lock expires after 30 seconds of inactivity
      if (ageInSeconds < 30) {
        return NextResponse.json({ locked: true, by: data.value });
      }
    }

    return NextResponse.json({ locked: false });
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

    const isMentor = holder === 'Mentor Utama';

    // Get current lock status
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
      // Mentor can always override any active lock
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
      // If lock was overtaken by someone else, heartbeat fails
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
