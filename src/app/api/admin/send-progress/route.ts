import { NextResponse } from 'next/server';
import { supabase, getFacilitatorMembers, getSessionParticipantId } from '@/lib/db';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';

export async function POST(request: Request) {
  try {
    // Guard: hanya Fajrin
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { facilitator_id, participant_id } = await request.json();

    if (!facilitator_id) {
      return NextResponse.json({ error: 'facilitator_id wajib diisi.' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';

    if (!resendApiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY belum di-konfigurasi di file .env.local' }, { status: 500 });
    }

    // 1. Get facilitator details
    const { data: facilitator, error: facilErr } = await supabase
      .from('participants')
      .select('name, profile_url')
      .eq('id', facilitator_id)
      .eq('role', 'facilitator')
      .single();

    if (facilErr || !facilitator) {
      return NextResponse.json({ error: 'Fasilitator tidak ditemukan atau tidak valid.' }, { status: 404 });
    }

    if (facilitator.profile_url !== 'https://www.skills.google/public_profiles/031574cc-02c5-4d38-80ce-cbb9bf95055c') {
      return NextResponse.json({ error: 'Akses Ditolak. Fitur pengiriman email progres hanya diizinkan untuk pemilik proyek.' }, { status: 403 });
    }

    // 2. Fetch all members
    const members = await getFacilitatorMembers(facilitator_id);
    const membersWithEmail = members.filter(m => m.email && m.email.trim() !== '');

    // 2. Fetch target members
    let targetMembers = membersWithEmail;
    if (participant_id) {
      targetMembers = membersWithEmail.filter(m => m.id === participant_id);
    }

    if (targetMembers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'Tidak ada peserta dengan alamat email terdaftar.' });
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://arcade-track2026.vercel.app';
    const results = [];

    for (const m of targetMembers) {
      const dashboardUrl = `${origin}/?profile_id=${m.id}`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Courier New', Courier, monospace; background-color: #f4f4f5; color: #000000; padding: 20px; margin: 0; }
    .card { background-color: #ffffff; border: 3px solid #000000; border-radius: 8px; padding: 24px; box-shadow: 4px 4px 0px #000000; max-width: 500px; margin: 20px auto; }
    .header { border-bottom: 3px solid #000000; padding-bottom: 12px; margin-bottom: 20px; }
    .title { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; }
    .subtitle { font-size: 10px; color: #71717a; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
    .table-container { border: 3px solid #000000; border-radius: 4px; overflow: hidden; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    th { background-color: #2196F3; color: #ffffff; padding: 10px; font-weight: 900; border-bottom: 3px solid #000000; }
    td { padding: 10px; border-bottom: 2px solid #000000; font-weight: bold; color: #000000; }
    tr:last-child td { border-bottom: none; }
    .btn { display: inline-block; background-color: #F59E0B; color: #000000; border: 2.5px solid #000000; border-radius: 4px; padding: 10px 20px; font-weight: 900; text-decoration: none; box-shadow: 3px 3px 0px #000000; font-size: 11px; margin-top: 10px; text-transform: uppercase; }
    .footer { font-size: 9px; color: #71717a; margin-top: 25px; border-top: 2.5px dashed #000000; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2 class="title">Laporan Progres Google Arcade</h2>
      <div class="subtitle">Halo ${m.name}, berikut progres belajar mingguan Anda</div>
    </div>
    <p style="font-size: 12px; line-height: 1.5;">Hi <strong>${m.name}</strong>,</p>
    <p style="font-size: 12px; line-height: 1.5;">Berikut adalah rincian pencapaian game dan skill badges yang telah Anda selesaikan di Google Skills Boost per minggu ini:</p>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Metrik Progres</th>
            <th>Pencapaian</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Game Badges</td>
            <td>${m.games_count || 0}</td>
          </tr>
          <tr>
            <td>Total Skill Badges</td>
            <td>${m.skills_count || 0}</td>
          </tr>
          <tr style="background-color: #FEF3C7;">
            <td>Total Poin Anda</td>
            <td>${(m.monthly_points || 0).toFixed(1)} Poin</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <p style="font-size: 12px; line-height: 1.5;">Anda bisa melihat daftar detail badge yang telah diselesaikan dengan mengunjungi dashboard live Anda:</p>
    <a href="${dashboardUrl}" class="btn">Buka Dashboard Live</a>
    
    <div class="footer">
      <p style="margin: 2px 0;">Laporan dikirim otomatis oleh Fasilitator Anda: <strong>${facilitator.name}</strong>.</p>
      <p style="margin: 2px 0;">Jika ada perbedaan data, mohon beritahu fasilitator untuk memicu sinkronisasi ulang.</p>
    </div>
  </div>
</body>
</html>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [m.email],
            subject: `Progres Google Arcade 2026 - ${m.name}`,
            html: htmlContent
          })
        });

        if (res.ok) {
          results.push({ success: true, email: m.email });
        } else {
          const errBody = await res.text();
          console.error(`Resend API Error for ${m.email}:`, errBody);
          results.push({ success: false, email: m.email, error: errBody });
        }
      } catch (err: any) {
        console.error(`Fetch Error for ${m.email}:`, err);
        results.push({ success: false, email: m.email, error: err.message });
      }

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failCount,
      total: targetMembers.length,
      results
    });

  } catch (error: any) {
    console.error('POST send progress email error:', error);
    return NextResponse.json({ error: 'Gagal mengirim email progres.' }, { status: 500 });
  }
}
