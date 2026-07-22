import './load_env';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { scrapeProfile } from '../src/lib/scraper';
import { ACTIVE_PERIOD_START } from '../src/lib/db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key not loaded!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const CONCURRENCY = 10;
const DELAY_MS = 200;

async function run() {
  const todayStr = new Date().toISOString().split('T')[0];
  console.log(`=== STARTING FACILITATOR MEMBERS SYNC FOR ${todayStr} ===`);

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalFailed = 0;
  const failedList: any[] = [];
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (true) {
    // Fetch members needing sync today (null or before today)
    const { data: members, error } = await supabase
      .from('facilitator_members')
      .select('*')
      .or(`last_synced.is.null,last_synced.lt.${todayStr}T00:00:00Z`)
      .order('last_synced', { ascending: true, nullsFirst: true })
      .range(0, 499);

    if (error) {
      console.error("Error fetching members batch:", error);
      break;
    }

    if (!members || members.length === 0) {
      console.log("Semua fasil member sudah ter-sync hari ini!");
      break;
    }

    const batchMembers = members;
    const batchSize = batchMembers.length;
    console.log(`\nProcessing batch of ${batchSize} members (Total done so far: ${totalProcessed})...`);

    let current = 0;

    async function worker(workerId: number) {
      while (true) {
        const idx = current++;
        if (idx >= batchSize) break;

        const member = batchMembers[idx];
        const memberNum = totalProcessed + idx + 1;

        try {
          const scrapeData = await scrapeProfile(member.profile_url);
          const badges = (scrapeData.badges || []).filter((b: any) => b.earned_date >= ACTIVE_PERIOD_START);
          const gamesCount = badges.filter((b: any) => b.category === 'game').length;
          const skillsCount = badges.filter((b: any) => b.category === 'skill_badge').length;
          const monthlyPoints = gamesCount + skillsCount * 0.5;

          const { error: updateErr } = await supabase
            .from('facilitator_members')
            .update({
              name: scrapeData.name || member.name,
              games_count: gamesCount,
              skills_count: skillsCount,
              monthly_points: monthlyPoints,
              last_synced: scrapeData.scraped_at,
              sync_status: 'sukses'
            })
            .eq('id', member.id);

          if (updateErr) throw updateErr;

          try {
            await supabase
              .from('participants')
              .update({
                monthly_points: monthlyPoints,
                last_synced: scrapeData.scraped_at
              })
              .ilike('profile_url', member.profile_url);
          } catch {}

          totalSuccess++;
          if (memberNum % 25 === 0 || idx === batchSize - 1) {
            console.log(`[Progress ${memberNum}] OK: ${member.name} (${scrapeData.name}) - Pts: ${monthlyPoints}`);
          }
        } catch (err: any) {
          totalFailed++;
          console.error(`[Progress ${memberNum}] FAILED: ${member.name} (ID: ${member.id}) - ${err.message}`);
          
          try {
            await supabase
              .from('facilitator_members')
              .update({ sync_status: 'gagal' })
              .eq('id', member.id);
          } catch {}

          failedList.push({ id: member.id, name: member.name, url: member.profile_url, error: err.message });
        }

        await delay(DELAY_MS);
      }
    }

    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    totalProcessed += batchSize;
  }

  console.log("\n================ SYNC COMPLETE ================");
  console.log(`Total Processed : ${totalProcessed}`);
  console.log(`Success         : ${totalSuccess}`);
  console.log(`Failed          : ${totalFailed}`);
  console.log("===============================================\n");

  if (failedList.length > 0) {
    const logDir = path.resolve('.gemini-logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    fs.writeFileSync(
      path.join(logDir, 'failed_syncs.json'),
      JSON.stringify(failedList, null, 2)
    );
    console.log(`Failed list saved to: ${path.join(logDir, 'failed_syncs.json')}`);
  }
}

run().catch(console.error);

