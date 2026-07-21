import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId, createAuditLog } from '@/lib/db';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (error) throw error;
    const maintenance = data?.value === 'true';

    return NextResponse.json({ maintenance });
  } catch (error: any) {
    console.error('GET maintenance error:', error);
    return NextResponse.json({ error: 'Gagal membaca status maintenance.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Guard: session harus Mentor Utama
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { enabled } = await request.json();

    const { error } = await supabase
      .from('system_settings')
      .upsert({
        key: 'maintenance_mode',
        value: enabled ? 'true' : 'false',
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    // Log audit pemeliharaan
    await createAuditLog(sessionUserId, enabled ? 'Enable Maintenance Mode' : 'Disable Maintenance Mode');

    return NextResponse.json({ success: true, maintenance: enabled });
  } catch (error: any) {
    console.error('POST maintenance error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui status maintenance.' }, { status: 500 });
  }
}
