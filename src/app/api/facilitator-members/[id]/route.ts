import { NextResponse } from 'next/server';
import { getFacilitatorMember, updateFacilitatorMember, deleteFacilitatorMember, ACTIVE_PERIOD_START, getSessionParticipantId, getParticipant } from '@/lib/db';
import { scrapeProfile } from '@/lib/scraper';

async function guardSession(request: Request, memberId: string): Promise<NextResponse | null> {
  const sessionUserId = getSessionParticipantId(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  const member = await getFacilitatorMember(memberId);
  if (!member) {
    return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
  }
  if (member.facilitator_id !== sessionUserId) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }
  return null;
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guard = await guardSession(request, id);
    if (guard) return guard;

    const deleted = await deleteFacilitatorMember(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE facilitator member error:', error);
    return NextResponse.json({ error: 'Gagal menghapus peserta.' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guard = await guardSession(request, id);
    if (guard) return guard;

    const member = await getFacilitatorMember(id);
    if (!member) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    let scrapeData;
    try {
      scrapeData = await scrapeProfile(member.profile_url);
    } catch (err: any) {
      await updateFacilitatorMember(id, { sync_status: 'gagal' }).catch(() => {});
      return NextResponse.json({ error: err.message || 'Gagal melakukan scraping data terbaru.' }, { status: 500 });
    }
    
    const badges = (scrapeData.badges || []).filter((b: any) => b.earned_date >= ACTIVE_PERIOD_START);
    const gamesCount = badges.filter((b: any) => b.category === 'game').length;
    const skillsCount = badges.filter((b: any) => b.category === 'skill_badge').length;
    const monthlyPoints = gamesCount + skillsCount * 0.5;

    const updated = await updateFacilitatorMember(id, {
      name: scrapeData.name || member.name,
      games_count: gamesCount,
      skills_count: skillsCount,
      monthly_points: monthlyPoints,
      last_synced: scrapeData.scraped_at,
      sync_status: 'sukses',
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    console.error('Sync facilitator member error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyinkronkan data.' }, { status: 500 });
  }
}
