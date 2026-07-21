import { NextResponse } from 'next/server';
import { getParticipant, updateParticipant, setBadges, getBadges, getSessionParticipantId } from '@/lib/db';
import { scrapeProfile } from '@/lib/scraper';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Guard: session harus valid
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    // Cek apakah user adalah peserta sendiri atau fasilitator
    const sessionUser = await getParticipant(sessionUserId);
    const isOwnData = sessionUserId === id;
    const isFacilitator = sessionUser?.role === 'facilitator';

    if (!isOwnData && !isFacilitator) {
      return NextResponse.json({ error: 'Forbidden. Anda tidak memiliki akses ke data ini.' }, { status: 403 });
    }

    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    let scrapeData;
    try {
      scrapeData = await scrapeProfile(participant.profile_url);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Gagal melakukan scraping data terbaru.' }, { status: 500 });
    }
    await setBadges(id, scrapeData.badges);

    const updated = await updateParticipant(id, {
      name: scrapeData.name || participant.name,
      avatar_url: scrapeData.avatar_url || participant.avatar_url,
      last_synced: scrapeData.scraped_at,
    });

    return NextResponse.json({ success: true, participant: updated });
  } catch (error: any) {
    console.error('Sync participant error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyinkronkan data.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Guard: session harus valid
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized. Silakan login terlebih dahulu.' }, { status: 401 });
    }

    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }
    const badges = await getBadges(id);
    return NextResponse.json({ participant, badges });
  } catch (error: any) {
    console.error('GET participant detail error:', error);
    return NextResponse.json({ error: 'Gagal mengambil detail peserta.' }, { status: 500 });
  }
}
