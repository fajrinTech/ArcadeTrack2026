import { NextResponse } from 'next/server';
import { getParticipant, updateParticipant, setBadges, deleteParticipant, getBadges } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participant = await getParticipant(id);
    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    const baseUrl = new URL(request.url).origin;
    const scrapeRes = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(participant.profile_url)}`, { cache: 'no-store' });
    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      return NextResponse.json({ error: errorData.error || 'Gagal melakukan scraping data terbaru.' }, { status: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteParticipant(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Peserta berhasil dihapus.' });
  } catch (error: any) {
    console.error('DELETE participant error:', error);
    return NextResponse.json({ error: 'Gagal menghapus peserta.' }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
