import { NextResponse } from 'next/server';
import { getSkillBadges } from '@/lib/db';

export async function GET() {
  try {
    const skills = await getSkillBadges();
    return NextResponse.json({ skills }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error: any) {
    console.error('GET skills error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data skill.' }, { status: 500 });
  }
}
