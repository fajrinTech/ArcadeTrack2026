import { NextResponse } from 'next/server';
import * as Cheerio from 'cheerio';
import { getSkillBadges, normalizeProfileUrl } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profileUrl = searchParams.get('url');

  if (!profileUrl) {
    return NextResponse.json({ error: 'URL profil wajib diisi.' }, { status: 400 });
  }

  const normalizedUrl = normalizeProfileUrl(profileUrl);
  if (!normalizedUrl) {
    return NextResponse.json({ error: 'Format URL tidak valid. Gunakan format: https://www.skills.google/public_profiles/uuid' }, { status: 400 });
  }

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      cache: 'no-store'
    });

    // Check if it redirected to home page (indicates private or invalid profile)
    if (response.redirected && (response.url === 'https://www.skills.google/' || response.url === 'https://www.skills.google')) {
      return NextResponse.json({ error: 'Profil tidak ditemukan atau disetel ke Privat. Silakan ubah pengaturan profil Anda menjadi Publik.' }, { status: 404 });
    }

    const html = await response.text();
    const $ = Cheerio.load(html);

    // Extract name
    let name = $('h1').first().text().trim();
    if (!name) {
      name = $('.ql-display-1').first().text().trim();
    }
    if (!name) {
      name = 'Google Cloud Learner';
    }

    // Extract profile avatar
    let avatarUrl =
      $('ql-avatar.profile-avatar').attr('src') ||
      $('.profile-avatar').attr('src') ||
      $('.profile-avatar img, .avatar img').first().attr('src') ||
      '';
    if (avatarUrl.startsWith('//')) avatarUrl = 'https:' + avatarUrl;
    if (avatarUrl && !avatarUrl.startsWith('http')) avatarUrl = '';

    // Fetch official skill badges from DB catalog
    let officialSkills: any[] = [];
    try {
      officialSkills = await getSkillBadges();
    } catch (dbErr) {
      console.error('Failed to fetch official skill badges from DB:', dbErr);
    }

    const normalizeBadgeName = (bName: string) => {
      return bName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\s+(challenge labs|challenge lab|course|quest|bites)$/, '');
    };

    const badges: any[] = [];
    
    // Select profile badges
    $('.profile-badge').each((_, el) => {
      const title = $(el).find('.ql-title-medium, .ql-subheading-1').text().trim();
      const dateText = $(el).find('.ql-body-medium, .ql-body-large, .ql-label-medium').text().trim();
      const imageUrl = $(el).find('img').attr('src') || '';

      if (title) {
        // Parse date (e.g. "Earned Jul 8, 2026" or "Earned on Jul 8, 2026")
        let cleanDateStr = dateText.replace(/Earned\s+(on\s+)?/i, '').trim();
        let earnedDate = new Date().toISOString().split('T')[0]; // Default to today if parsing fails
        if (cleanDateStr) {
          const parsedDate = new Date(cleanDateStr);
          if (!isNaN(parsedDate.getTime())) {
            earnedDate = parsedDate.toISOString().split('T')[0];
          }
        }

        // Categorize badge based on confirmed PRD rules:
        // Game badges: Arcade Voyage, Arcade Base Camp, Arcade Adventure, Arcade Trail, Safe Spaces, Arcade Simulator, etc.
        const lowerTitle = title.toLowerCase();
        const isGame = (
          lowerTitle.includes('arcade') || 
          lowerTitle.includes('voyage') || 
          lowerTitle.includes('base camp') || 
          lowerTitle.includes('adventure') || 
          lowerTitle.includes('trail') || 
          lowerTitle.includes('safe spaces') || 
          lowerTitle.includes('simulator') || 
          lowerTitle.includes('trivia')
        ) && !lowerTitle.includes('boost bites') 
          && !lowerTitle.includes('guidelines') 
          && !lowerTitle.includes('facilitator');

        // Check if it is a valid skill badge by catalog or modal description heuristic
        let isSkillBadge = false;
        if (!isGame) {
          // Heuristic: check if the description modal contains "skill badge"
          const modalId = $(el).find('ql-button').attr('modal');
          let hasSkillBadgeDescription = false;
          if (modalId) {
            const dialog = $(`#${modalId}`);
            if (dialog.length > 0) {
              const description = dialog.find('p').text().toLowerCase();
              hasSkillBadgeDescription = description.includes('skill badge');
            }
          }

          // Catalog match
          const normTitle = normalizeBadgeName(title);
          const hasCatalogMatch = officialSkills.some(skill => {
            return normTitle === normalizeBadgeName(skill.name);
          });

          isSkillBadge = hasCatalogMatch || hasSkillBadgeDescription;
        }

        if (isGame || isSkillBadge) {
          badges.push({
            badge_name: title,
            category: isGame ? 'game' : 'skill_badge',
            points: isGame ? 1 : 0.5,
            earned_date: earnedDate,
            image_url: imageUrl
          });
        }
      }
    });

    // Calculate points summary
    const gameBadges = badges.filter(b => b.category === 'game');
    const skillBadges = badges.filter(b => b.category === 'skill_badge');

    const totalGamePoints = gameBadges.length;
    const totalSkillPoints = skillBadges.length * 0.5;
    const totalBasePoints = totalGamePoints + totalSkillPoints;

    return NextResponse.json({
      name,
      avatar_url: avatarUrl,
      profile_url: normalizedUrl,
      scraped_at: new Date().toISOString(),
      badges_count: badges.length,
      total_points: totalBasePoints,
      badges
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data dari Google Skills Boost. Silakan coba beberapa saat lagi.' }, { status: 500 });
  }
}
