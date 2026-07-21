import { NextResponse } from 'next/server';
import { getSessionParticipantId } from '@/lib/db';
import { parseCSV } from '@/app/panel/utils';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';

export async function GET(request: Request) {
  try {
    // Guard: session harus Fajrin (Mentor Utama)
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const sheetUrl = process.env.FEEDBACK_SHEET_URL;
    if (!sheetUrl) {
      return NextResponse.json({ error: 'FEEDBACK_SHEET_URL belum dikonfigurasi di env.' }, { status: 500 });
    }

    const res = await fetch(sheetUrl, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Gagal mengambil data dari Google Sheets.' }, { status: res.status });
    }

    const csvText = await res.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return NextResponse.json({ feedback: [] });
    }

    // Map rows (skip header row 0)
    const feedback = rows.slice(1).map((row, idx) => {
      const timestamp = row[0] || '';
      // Jika nama sama dengan timestamp atau kosong, ubah jadi Anonim
      let name = (row[1] || '').trim();
      if (!name || name === timestamp) {
        name = 'Anonim';
      }
      const type = row[2] || 'Masukan';
      const description = row[3] || '';
      const profileUrl = row[4] || '';

      return {
        id: `fb-${idx}`,
        timestamp,
        name,
        type,
        description,
        profileUrl
      };
    }).reverse(); // Urutkan dari yang terbaru di atas

    return NextResponse.json({ feedback });
  } catch (error: any) {
    console.error('GET feedback error:', error);
    return NextResponse.json({ error: 'Gagal mengambil feedback.' }, { status: 500 });
  }
}
