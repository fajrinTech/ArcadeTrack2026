import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function run() {
  console.log("Resetting database...");

  const { error: badgeError, count: badgeCount } = await supabase
    .from('badges')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (badgeError) console.error("Error deleting badges:", badgeError);
  else console.log(`Deleted ${badgeCount ?? 0} badges.`);

  const { error: partError, count: partCount } = await supabase
    .from('participants')
    .delete({ count: 'exact' })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (partError) console.error("Error deleting participants:", partError);
  else console.log(`Deleted ${partCount ?? 0} participants.`);

  console.log("Database reset complete!");
}

run().catch(console.error);
