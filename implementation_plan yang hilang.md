# Plan Keamanan Final — Arcade Tracker

## Desain yang Disetujui

```
┌─────────────┐    POST /api/participants     ┌────────────────────┐
│  Login Utama │ ─────────────────────────────→│  Session: peserta  │
│  /           │   { profile_url }             │  role: participant │
└─────────────┘                                └────────────────────┘

┌─────────────┐    POST /api/participants      ┌────────────────────┐
│ Gate-Fasil   │ ─────────────────────────────→│  Session: fasil    │
│ /gate-fasil  │   { profile_url, fasil_code } │  role: facilitator │
└─────────────┘                                └────────────────────┘

┌─────────────┐    POST /api/participants      ┌────────────────────┐
│ Mentor Panel │ ─────────────────────────────→│  Session: fasil    │
│ /panel/mentor│   { profile_url }             │  role: facilitator │
└─────────────┘    (tidak pakai kode —         └────────────────────┘
                    pakai hardcoded ID/URL
                    dari database)
```

**Catatan penting:** Mentor = fasilitator biasa dari sisi database. Bedanya hanya `participantId` di-hardcoded di guard untuk akses panel mentor. Tidak ada role `admin` atau `mentor` di database. Ini sengaja untuk penyamaran.

---

## 3 Layer Keamanan

### Layer 1: Session Cookie

| Item | Detail |
|---|---|
| Apa | Cookie `httpOnly` berisi `participantId` yang di-sign pakai HMAC-SHA256 |
| Library | Web Crypto API (`crypto.subtle.sign/verify`) — built-in Node.js/Edge, zero dep |
| Nama cookie | `arcade_session` |
| Masa berlaku | 7 hari |
| Opsi cookie | `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `path: '/'` |
| Secret | `SESSION_SECRET` di `.env.local` |

**Fungsi baru di `src/lib/db.ts`:**

```ts
// Buat session cookie
export async function createSession(participantId: string): Promise<string>

// Baca & verifikasi session → return participantId atau null
export async function verifySession(request: Request): Promise<string | null>
```

**Login participant** — POST `/api/participants` setelah sukses:

```ts
const session = await createSession(participant.id);
return NextResponse.json(data, {
  headers: { 'Set-Cookie': session }
});
```

**Login gate-fasil** — POST `/api/participants` dengan `role: 'facilitator'` + kode.

**Logout** — hapus cookie `arcade_session`.

### Layer 2: Kode Akses Gate-Fasil

**Satu-satunya perubahan di gate-fasil:**

Tambah input `Kode Akses` di [gate-fasil/page.tsx](file:///home/fajrin/Documents/arcade2026/src/app/gate-fasil/page.tsx):

```text
┌─────────────────────────────────────────┐
│  FACILITATOR GATE                       │
│                                         │
│  URL Profil Skills Boost                │
│  [input url]                            │
│                                         │
│  Kode Akses Fasilitator                 │
│  [input kode]                           │
│                                         │
│  [ REGISTER AS FACILITATOR ]            │
│                                         │
│  ← Kembali ke Login Utama              │
└─────────────────────────────────────────┘
```

**Backend** — POST `/api/participants` menerima:

```json
{
  "profile_url": "https://www.skills.google/public_profiles/...",
  "role": "facilitator",
  "facil_code": "arcade2026"
}
```

**Validasi server:**

```ts
// Jika role === 'facilitator', wajib cocok dengan env
if (role === 'facilitator') {
  if (!facil_code || facil_code !== process.env.FACILITATOR_CODE) {
    return 403: 'Kode akses fasilitator tidak valid.'
  }
}

// Jika role === 'participant', tidak perlu kode
if (role === 'participant') {
  // Tidak perlu kode, langsung proses
}
```

**Variable env:**

```env
FACILITATOR_CODE=arcade2026
SESSION_SECRET=(auto-generated saat deploy)
```

**Flow gate-fasil setelah modifikasi:**

1. User buka `/gate-fasil`
2. Masukkan URL profil + kode akses
3. Server cek kode → cocok → set role `facilitator` di DB
4. Server buat session cookie
5. Response ke client → client simpan `myProfileId` di localStorage (untuk UI saja)
6. Client redirect ke `/panel`

**Siapa yang bagikan kode:** Kamu (Fajrin). Berikan langsung ke fasil yang memang berhak. Jangan taruh di GitHub atau chat publik.

**Efek ke fasil yang sudah terdaftar:** Mereka sudah punya `role: 'facilitator'` di DB. Gate-fasil hanya perlu login (cek kode → buat session). Flow sama, kode hanya verifikasi bahwa mereka fasil yang sah.

### Layer 3: Guard Semua Endpoint Mutasi

Prinsip: **baca session cookie → cek ownership di database**.

| Endpoint | Guard |
|---|---|
| `GET /api/participants` | **Tidak di-guard** — data publik untuk leaderboard |
| `GET /api/participants/[id]` | **Tidak di-guard** — data publik untuk dashboard |
| `POST /api/participants` (login) | **PUBLIC** — entry point, set cookie |
| `POST /api/participants/[id]` (sync) | Session ada → ID di URL = session ID, **ATAU** role di DB = `facilitator` |
| `DELETE /api/participants/[id]` | ~~HAPUS~~ ✅ Sudah dihapus |
| `GET /api/facilitator-members` | Session ada → query by `facilitator_id = session ID` |
| `POST /api/facilitator-members` (bulk) | Session ada → `facilitator_id` di body = session ID |
| `POST /api/facilitator-members/[id]` (sync) | Session ada → member.facilitator_id = session ID |
| `DELETE /api/facilitator-members/[id]` | Session ada → member.facilitator_id = session ID |
| `POST /api/sync-lock` | Session ada → ID = Mentor Utama (hardcoded `a3961d06-...`) |
| `POST /api/admin/send-progress` | Session ada → ID = Mentor Utama + URL profil = `031574cc-...` |
| `GET /api/admin/monitor` | Session ada → ID = Mentor Utama + URL profil = `031574cc-...` |
| `GET /api/scrape` | **Rate limiter** saja — tidak perlu auth (scraper publik) |

**Helper baru di `src/lib/db.ts`:**

```ts
// Helper untuk guard
export async function requireSession(request: Request): Promise<string | null> {
  return verifySession(request);
}
```

**Contoh guard di endpoint sync participant:**

```ts
export async function POST(request: Request, { params }) {
  const { id } = await params;
  const sessionUserId = await verifySession(request);
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Cek apakah user adalah peserta sendiri atau fasilitator
  const participant = await getParticipant(sessionUserId);
  const targetParticipant = await getParticipant(id);
  if (!targetParticipant) {
    return NextResponse.json({ error: 'Peserta tidak ditemukan.' }, { status: 404 });
  }

  const isOwnData = sessionUserId === id;
  const isFacilitator = participant?.role === 'facilitator';

  if (!isOwnData && !isFacilitator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... sync logic ...
}
```

---

## File yang Disentuh

| # | File | Perubahan | Baris |
|---|---|---|---|
| 1 | `src/lib/db.ts` | +2 fungsi session (`createSession`, `verifySession`) | ~40 |
| 2 | `src/app/api/participants/route.ts` | +validasi kode fasilitator + set cookie di response | ~15 |
| 3 | `src/app/gate-fasil/page.tsx` | +input field `Kode Akses` | ~8 |
| 4 | `src/app/api/participants/[id]/route.ts` | +guard cookie di POST sync | ~10 |
| 5 | `src/app/api/facilitator-members/route.ts` | +guard cookie di POST bulk | ~8 |
| 6 | `src/app/api/facilitator-members/[id]/route.ts` | +guard cookie di POST & DELETE | ~15 |
| 7 | `src/app/api/sync-lock/route.ts` | +guard cookie (hanya Mentor Utama) | ~8 |
| 8 | `src/app/api/admin/send-progress/route.ts` | +guard cookie (hanya Mentor Utama) | ~5 |
| 9 | `src/app/api/admin/monitor/route.ts` | +guard cookie (hanya Mentor Utama) | ~5 |
| 10 | `src/app/api/scrape/route.ts` | +rate limiter in-memory | ~10 |

**Total: ~10 file, ~120 baris baru.**

**File yang TIDAK disentuh:** Semua komponen UI, layout, panel page, header, modals, charts.

---

## Client Side

**Tidak ada perubahan signifikan di client.**

- `localStorage` tetap dipakai untuk `myProfileId` (tampilan UI, "my profile" highlight).
- `fetch()` otomatis kirim cookie karena same-origin — tidak perlu header tambahan.
- Satu-satunya perubahan: `handleLoginSubmit` di `page.tsx` bisa tetap sama karena cookie di-set oleh server via response header.
- Logout (`handleResetSession`) perlu hapus cookie juga — tambah `fetch('/api/auth/logout')` atau `document.cookie = ...` (cookie httpOnly tidak bisa dihapus dari client, perlu route handler logout).

**Logout:** tambah route handler kecil `POST /api/auth/logout` yang menghapus cookie. Client panggil saat keluar sesi.

---

## Efek ke User

| User | Efek |
|---|---|
| Peserta biasa | **Tidak ada efek.** Login normal. |
| Fasilitator yang sudah terdaftar | **Tidak ada efek.** Login ke gate-fasil, masukkan kode sekali, lalu normal. |
| Mentor (kamu) | **Tidak ada efek.** Login normal dari halaman utama, lalu buka `/panel/mentor`. |
| Penyerang | **Tidak bisa:** hapus data peserta, sync data orang lain, kirim email massal, ambil lock sistem, spam scraper. |

---

## Verification Setelah Deploy

1. Buka `/` → login sebagai peserta → coba sync profil sendiri → **berhasil**.
2. Coba sync profil orang lain dari console → **403 Forbidden**.
3. Buka `/gate-fasil` → masukkan URL + kode yang benar → **berhasil login sebagai fasilitator**.
4. Coba tanpa kode atau kode salah → **403 Kode tidak valid**.
5. Buka `/panel/mentor` → buka monitor → **berhasil** (session cocok dengan hardcoded ID).
6. Akses `/api/admin/monitor?profile_id=random` tanpa session → **401 Unauthorized**.
7. Panggil `/api/scrape` 2x dalam 10 detik dari IP sama → **429 Too Many Requests**.
