import { NextResponse } from 'next/server';
import { getParticipants, getParticipantByUrl, addParticipant, updateParticipant, setBadges, normalizeProfileUrl, createSessionToken, clearSessionCookie } from '@/lib/db';

const SESSION_COOKIE = 'arcade_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function GET() {
  try {
    const participants = await getParticipants();
    return NextResponse.json({ participants });
  } catch (error: any) {
    console.error('GET participants error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data peserta.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { profile_url, role = 'participant', facil_code } = await request.json();

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
      const requestRole = role === 'facilitator' ? 'facilitator' : 'participant';
      if (requestRole === 'facilitator' && exists.role !== 'facilitator') {
        // Upgrade role: butuh facilitator code
        if (!facil_code || facil_code !== process.env.FACILITATOR_CODE) {
          return NextResponse.json({ error: 'Kode akses fasilitator tidak valid.' }, { status: 403 });
        }
        const updated = await updateParticipant(exists.id, { role: 'facilitator' });
        const result = updated || exists;
        const cookie = `${SESSION_COOKIE}=${createSessionToken(result.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
        return NextResponse.json({ ...result, returning: true }, { status: 200, headers: { 'Set-Cookie': cookie } });
      }
      // Login biasa - tidak perlu kode
      const cookie = `${SESSION_COOKIE}=${createSessionToken(exists.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
      return NextResponse.json({ ...exists, returning: true }, { status: 200, headers: { 'Set-Cookie': cookie } });
    }

    // User BARU: register
    const requestRole = role === 'facilitator' ? 'facilitator' : 'participant';

    // Jika register sebagai fasilitator, wajib kode
    if (requestRole === 'facilitator') {
      if (!facil_code || facil_code !== process.env.FACILITATOR_CODE) {
        return NextResponse.json({ error: 'Kode akses fasilitator tidak valid.' }, { status: 403 });
      }
    }

    const newParticipant = await addParticipant({ name: '', profile_url: targetUrl, role: requestRole });

    // Auto-scrape badges on signup
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
        const result = updated || newParticipant;
        const cookie = `${SESSION_COOKIE}=${createSessionToken(result.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
        return NextResponse.json({ ...result, returning: false }, { status: 200, headers: { 'Set-Cookie': cookie } });
      }
    } catch (scrapeErr) {
      console.error('Failed auto-scrape on signup:', scrapeErr);
    }

    const cookie = `${SESSION_COOKIE}=${createSessionToken(newParticipant.id)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
    return NextResponse.json({ ...newParticipant, returning: false }, { status: 200, headers: { 'Set-Cookie': cookie } });
  } catch (error: any) {
    console.error('POST participant error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan peserta.' }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ message: 'Logged out' }, {
    headers: { 'Set-Cookie': clearSessionCookie() },
  });
}
