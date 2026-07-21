import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilitatorId = searchParams.get('facilitator_id');

    if (!facilitatorId) {
      return NextResponse.json({ error: 'facilitator_id wajib diisi.' }, { status: 400 });
    }

    // Guard: session harus valid dan milik user yang login
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== facilitatorId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // Ambil data riwayat upload diurutkan dari yang terbaru
    const { data: history, error } = await supabase
      .from('upload_history')
      .select('*')
      .eq('facilitator_id', facilitatorId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: history ?? [] });
  } catch (error: any) {
    console.error('GET upload history error:', error);
    return NextResponse.json({ error: 'Gagal mengambil riwayat unggahan.' }, { status: 500 });
  }
}
