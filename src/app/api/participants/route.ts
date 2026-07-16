import { NextResponse } from 'next/server';
import { getParticipants, getParticipantByUrl, addParticipant, updateParticipant, setBadges, normalizeProfileUrl } from '@/lib/db';

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

    const targetUrl = normalizeProfileUrl(profile_url);
    if (!targetUrl) {
      return NextResponse.json({ error: 'Format URL tidak valid. Gunakan format: https://www.skills.google/public_profiles/uuid' }, { status: 400 });
    }

    // Sudah terdaftar → login kembali atau upgrade role jika fasilitator
    const exists = await getParticipantByUrl(targetUrl);
    if (exists) {
      if (role === 'facilitator' && exists.role !== 'facilitator') {
        const updated = await updateParticipant(exists.id, { role: 'facilitator' });
        return NextResponse.json({ ...(updated || exists), returning: true });
      }
      return NextResponse.json({ ...exists, returning: true });
    }

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
