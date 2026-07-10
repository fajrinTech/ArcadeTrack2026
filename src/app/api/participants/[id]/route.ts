import { NextResponse } from 'next/server';
import { getParticipants, updateParticipant, setBadges, deleteParticipant } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const participants = getParticipants();
    const participant = participants.find(p => p.id === id);

    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    const baseUrl = new URL(request.url).origin;
    const scrapeRes = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(participant.profile_url)}`, {
      cache: 'no-store'
    });

    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      return NextResponse.json({ error: errorData.error || 'Gagal melakukan scraping data terbaru.' }, { status: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();

    // Update badges
    setBadges(id, scrapeData.badges);

    // Update participant details
    const updated = updateParticipant(id, {
      name: scrapeData.name || participant.name,
      avatar_url: scrapeData.avatar_url || participant.avatar_url,
      total_points: scrapeData.total_points,
      badges_count: scrapeData.badges_count,
      last_synced: scrapeData.scraped_at
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
    const deleted = deleteParticipant(id);

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
    const participants = getParticipants();
    const participant = participants.find(p => p.id === id);

    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    // Get badges for this participant
    const { getBadges } = require('@/lib/db');
    const badges = getBadges(id);

    return NextResponse.json({ participant, badges });
  } catch (error: any) {
    console.error('GET participant detail error:', error);
    return NextResponse.json({ error: 'Gagal mengambil detail peserta.' }, { status: 500 });
  }
}
