import { NextResponse } from 'next/server';
import { getParticipants, getParticipantByUrl, addParticipant, updateParticipant, setBadges } from '@/lib/db';

export async function GET() {
  try {
    // monthly_points sudah tersimpan di kolom, tak perlu join badges.
    const participants = await getParticipants();
    return NextResponse.json({ participants });
  } catch (error: any) {
    console.error('GET participants error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data peserta.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { profile_url, role = 'participant' } = await request.json();

    if (!profile_url) {
      return NextResponse.json({ error: 'URL profil wajib diisi.' }, { status: 400 });
    }

    // Normalize to skills.google
    let targetUrl = profile_url.trim();
    if (targetUrl.includes('cloudskillsboost.google/public_profiles/')) {
      targetUrl = targetUrl.replace('cloudskillsboost.google/public_profiles/', 'skills.google/public_profiles/');
    }

    // Sudah terdaftar → login kembali
    const exists = await getParticipantByUrl(targetUrl);
    if (exists) return NextResponse.json({ ...exists, returning: true });

    const newParticipant = await addParticipant({ name: '', profile_url: targetUrl, role });

    // Auto-scrape badges on signup (nama & avatar dari profil)
    try {
      const baseUrl = new URL(request.url).origin;
      const scrapeRes = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(targetUrl)}`, { cache: 'no-store' });
      if (scrapeRes.ok) {
        const scrapeData = await scrapeRes.json();
        await setBadges(newParticipant.id, scrapeData.badges);
        const updated = await updateParticipant(newParticipant.id, {
          name: scrapeData.name || newParticipant.name,
          avatar_url: scrapeData.avatar_url,
          last_synced: scrapeData.scraped_at,
        });
        return NextResponse.json({ ...(updated || newParticipant), returning: false });
      }
    } catch (scrapeErr) {
      console.error('Failed auto-scrape on signup:', scrapeErr);
    }

    return NextResponse.json({ ...newParticipant, returning: false });
  } catch (error: any) {
    console.error('POST participant error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan peserta.' }, { status: 500 });
  }
}
