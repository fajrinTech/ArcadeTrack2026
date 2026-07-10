import fs from 'fs';
import path from 'path';

export interface Participant {
  id: string;
  name: string;
  profile_url: string;
  avatar_url?: string;
  role: 'facilitator' | 'participant';
  monthly_target_points: number;
  created_at: string;
  total_points?: number;
  monthly_points?: number;
  badges_count?: number;
  last_synced?: string;
}

export interface Badge {
  id: string;
  participant_id: string;
  badge_name: string;
  category: 'game' | 'skill_badge';
  points: number;
  earned_date: string;
  image_url?: string;
  scraped_at: string;
}

interface DatabaseSchema {
  participants: Participant[];
  badges: Badge[];
}

const DB_FILE = path.join(process.cwd(), 'src/lib/db.json');

// Ensure DB file exists
function initDb(): DatabaseSchema {
  const defaultDb: DatabaseSchema = {
    participants: [],
    badges: []
  };

  try {
    // Check if dir exists
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }

    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to init DB:', error);
    return defaultDb;
  }
}

export function readDb(): DatabaseSchema {
  return initDb();
}

export function writeDb(data: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write DB:', error);
  }
}

// Participant helpers
export function getParticipants(): Participant[] {
  const db = readDb();
  return db.participants;
}

export function addParticipant(participant: Omit<Participant, 'id' | 'created_at'>): Participant {
  const db = readDb();
  const newParticipant: Participant = {
    ...participant,
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    created_at: new Date().toISOString()
  };
  db.participants.push(newParticipant);
  writeDb(db);
  return newParticipant;
}

export function updateParticipant(id: string, updates: Partial<Participant>): Participant | null {
  const db = readDb();
  const index = db.participants.findIndex(p => p.id === id);
  if (index === -1) return null;

  db.participants[index] = {
    ...db.participants[index],
    ...updates
  };
  writeDb(db);
  return db.participants[index];
}

export function deleteParticipant(id: string): boolean {
  const db = readDb();
  const initialLength = db.participants.length;
  db.participants = db.participants.filter(p => p.id !== id);
  db.badges = db.badges.filter(b => b.participant_id !== id); // Cascade delete badges
  writeDb(db);
  return db.participants.length < initialLength;
}

// Badge helpers
export function getBadges(participantId?: string): Badge[] {
  const db = readDb();
  if (participantId) {
    return db.badges.filter(b => b.participant_id === participantId);
  }
  return db.badges;
}

export function setBadges(participantId: string, newBadges: Omit<Badge, 'id' | 'participant_id' | 'scraped_at'>[]): Badge[] {
  const db = readDb();
  
  // Remove existing badges for this participant
  db.badges = db.badges.filter(b => b.participant_id !== participantId);

  // Add new badges
  const addedBadges: Badge[] = newBadges.map(b => ({
    ...b,
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    participant_id: participantId,
    scraped_at: new Date().toISOString()
  }));

  db.badges.push(...addedBadges);
  writeDb(db);
  return addedBadges;
}
