# 🎮 Arcade Track 2026

> A high-fidelity, Neobrutalist-designed analytics dashboard and progress tracker for Google Cloud Arcade 2026 participants.

---

## ⚡ Overview

**Arcade Track 2026** is a dashboard that tracks your progress through the Google Cloud Arcade challenge. It dynamically scrapes earned badges from Google Skills Boost, calculates points, tracks milestones, and hosts a real-time player leaderboard using Supabase.

Designed with a bold, modern **Neobrutalism UI** theme (featuring high contrast layouts, thick black borders, and stark shadows).

---

## ✨ Features

- **📊 Live Dashboard**: View your overall progress, Arcade tier eligibility, and total points in real time.
- **🏆 Milestone Progress**: Tracks your progress towards Milestone 1, 2, and 3 targets (Games & Skill Badges).
- **🛤️ Arcade Track Tracker**: Focuses on specific active month games and displays completion status (e.g., Arcade Base Camp, Arcade Adventure, etc.).
- **⚡ Fasttrack Catalog**: Access all 93 active Google Cloud Skill Badges dynamically populated from the database. Complete with instant search, difficulty filtering, and completion detection.
- **🥇 Real-time Leaderboard**: Compare points, completed games, and skill badges with other participants on the leaderboard.
- **🔄 Sync Engine**: Sync your active badge profile instantly via background scraping of your public Google Skills Boost profile.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with RLS policies enabled)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Architecture**: Custom Neobrutalism Components with [Radix Icons](https://icons.modulz.app/)
- **Icons**: Radix UI Icons

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/fajrinTech/ArcadeTrack2026.git
cd ArcadeTrack2026
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/            # API Route handlers (Participants, Skills, Scraping)
│   │   ├── globals.css     # Global styles & Neobrutalist design tokens
│   │   ├── layout.tsx      # Main application layout
│   │   └── page.tsx        # Homepage entry
│   ├── components/         # Neobrutalist UI components (Dashboard, Chart, Header)
│   └── lib/
│       ├── db.ts           # Supabase client & database helper queries
│       └── scraper.ts      # Profile scraping service
├── package.json
└── README.md
```

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.
