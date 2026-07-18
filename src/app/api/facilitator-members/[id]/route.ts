import { NextResponse } from 'next/server';
import { getFacilitatorMember, updateFacilitatorMember, deleteFacilitatorMember, ACTIVE_PERIOD_START } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const member = await getFacilitatorMember(id);
    if (!member) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
    }

    const baseUrl = new URL(request.url).origin;
    const scrapeRes = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(member.profile_url)}`, { cache: 'no-store' });
    if (!scrapeRes.ok) {
      const errorData = await scrapeRes.json();
      return NextResponse.json({ error: errorData.error || 'Gagal melakukan scraping data terbaru.' }, { status: scrapeRes.status });
    }

    const scrapeData = await scrapeRes.json();
    
    // Calculate new badge counts (only for current active period)
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
    });

    return NextResponse.json({ success: true, member: updated });
  } catch (error: any) {
    console.error('Sync facilitator member error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat menyinkronkan data.' }, { status: 500 });
  }
}
