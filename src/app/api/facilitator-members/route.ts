import { NextResponse } from 'next/server';
import { getFacilitatorMembers, bulkUpsertFacilitatorMembers, getSessionParticipantId } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const facilitatorId = searchParams.get('facilitator_id');

    if (!facilitatorId) {
      return NextResponse.json({ error: 'facilitator_id wajib diisi.' }, { status: 400 });
    }

    // Guard: session harus valid dan facilitator_id harus milik user yang login
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== facilitatorId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const members = await getFacilitatorMembers(facilitatorId);
    return NextResponse.json({ members });
  } catch (error: any) {
    console.error('GET facilitator members error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data peserta bimbingan.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { facilitator_id, members, filename } = await request.json();

    if (!facilitator_id || !Array.isArray(members)) {
      return NextResponse.json({ error: 'Data input tidak valid.' }, { status: 400 });
    }

    // Guard: session harus valid dan facilitator_id harus milik user yang login
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== facilitator_id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const result = await bulkUpsertFacilitatorMembers(facilitator_id, members, filename);
    return NextResponse.json({ success: true, count: result.length, members: result });
  } catch (error: any) {
    console.error('POST bulk facilitator members error:', error);
    return NextResponse.json({ error: 'Gagal mengimpor data peserta.' }, { status: 500 });
  }
}
