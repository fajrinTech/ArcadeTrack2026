import { NextResponse } from 'next/server';
import { scrapeProfile } from '@/lib/scraper';

// ponytail: simple in-memory rate limiter — reset tiap restart server.
const rateMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000;

function checkRateLimit(request: Request): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const now = Date.now();
  const last = rateMap.get(ip);
  if (last && now - last < RATE_LIMIT_MS) return false;
  rateMap.set(ip, now);
  return true;
}

export async function GET(request: Request) {
  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: 'Too many requests. Tunggu 10 detik.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const profileUrl = searchParams.get('url');

  if (!profileUrl) {
    return NextResponse.json({ error: 'URL profil wajib diisi.' }, { status: 400 });
  }

  try {
    const result = await scrapeProfile(profileUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Scrape error:', error);
    const status = error.message.includes('tidak ditemukan') || error.message.includes('Privat') ? 404 : 500;
    return NextResponse.json({ error: error.message || 'Gagal mengambil data dari Google Skills Boost. Silakan coba beberapa saat lagi.' }, { status });
  }
}
