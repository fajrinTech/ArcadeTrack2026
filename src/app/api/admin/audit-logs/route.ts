import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId } from '@/lib/db';

const FAJRIN_ID = 'a3961d06-d854-4348-9977-004d5a3dd8d8';

export async function GET(request: Request) {
  try {
    // Guard: session harus Mentor Utama
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== FAJRIN_ID) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Ambil data audit logs seluruhnya
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Jika format adalah CSV, langsung kembalikan file download
    if (format === 'csv') {
      let csvContent = '\ufeffWaktu,Aktor,Aksi,Detail\n'; // Bom UTF-8 untuk Excel
      for (const log of logs || []) {
        const time = new Date(log.created_at).toLocaleString('id-ID');
        const actor = log.actor_name || 'System';
        const action = log.action;
        const details = JSON.stringify(log.details || {}).replace(/"/g, '""');
        csvContent += `"${time}","${actor}","${action}","${details}"\n`;
      }

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audit_logs.csv"'
        }
      });
    }

    return NextResponse.json({ logs: logs ?? [] });
  } catch (error: any) {
    console.error('GET audit logs error:', error);
    return NextResponse.json({ error: 'Gagal memuat audit logs.' }, { status: 500 });
  }
}
