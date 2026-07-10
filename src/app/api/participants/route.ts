import { NextResponse } from 'next/server';
import { getParticipants, addParticipant, updateParticipant, setBadges, readDb, getBadges, Badge } from '@/lib/db';

export async function GET() {
  try {
    const participants = getParticipants();
    const allBadges = getBadges();
    const activeMonthPrefix = '2026-07';

    const enrichedParticipants = participants.map(p => {
      const pBadges = allBadges.filter((b: Badge) => b.participant_id === p.id);
      const monthlyBadges = pBadges.filter((b: Badge) => b.earned_date.startsWith(activeMonthPrefix));
      
      const gameCount = monthlyBadges.filter((b: Badge) => b.category === 'game').length;
      const skillCount = monthlyBadges.filter((b: Badge) => b.category === 'skill_badge').length;
      const monthlyPoints = gameCount + (skillCount * 0.5);

      return {
        ...p,
        monthly_points: monthlyPoints
      };
    });

    return NextResponse.json({ participants: enrichedParticipants });
  } catch (error: any) {
    console.error('GET participants error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data peserta.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, profile_url, role = 'participant' } = body;

    if (!name || !profile_url) {
      return NextResponse.json({ error: 'Nama dan URL profil wajib diisi.' }, { status: 400 });
    }

    // Normalize URL
    let targetUrl = profile_url.trim();
    if (targetUrl.includes('cloudskillsboost.google/public_profiles/')) {
      targetUrl = targetUrl.replace('cloudskillsboost.google/public_profiles/', 'skills.google/public_profiles/');
    }

    // Check for duplicate profile_url (treat as login if exists)
    const participants = getParticipants();
    const exists = participants.find(p => p.profile_url.toLowerCase() === targetUrl.toLowerCase());
    if (exists) {
      return NextResponse.json(exists);
    }

    // Add participant to DB (without points/badges count first)
    const newParticipant = addParticipant({
      name,
      profile_url: targetUrl,
      role,
      monthly_target_points: 30 // Default Milestone 1 + Bonus = 30 points
    });

    // Automatically trigger scraping to get their badges
    try {
      const baseUrl = new URL(request.url).origin;
      const scrapeRes = await fetch(`${baseUrl}/api/scrape?url=${encodeURIComponent(targetUrl)}`, {
        cache: 'no-store'
      });
      
      if (scrapeRes.ok) {
        const scrapeData = await scrapeRes.json();
        
        // Save badges
        setBadges(newParticipant.id, scrapeData.badges);

        // Update participant details
        const updated = updateParticipant(newParticipant.id, {
          name: scrapeData.name || name, // Use name from profile if available
          avatar_url: scrapeData.avatar_url,
          total_points: scrapeData.total_points,
          badges_count: scrapeData.badges_count,
          last_synced: scrapeData.scraped_at
        });

        return NextResponse.json(updated || newParticipant);
      }
    } catch (scrapeErr) {
      console.error('Failed auto-scrape on signup:', scrapeErr);
    }

    // Return the new participant even if scrape failed (will sync later)
    return NextResponse.json(newParticipant);

  } catch (error: any) {
    console.error('POST participant error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan peserta.' }, { status: 500 });
  }
}
