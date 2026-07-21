import { NextResponse } from 'next/server';
import { supabase, getSessionParticipantId, createAuditLog } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { facilitator_id, batch_id } = await request.json();

    if (!facilitator_id || !batch_id) {
      return NextResponse.json({ error: 'Data input tidak valid.' }, { status: 400 });
    }

    // Guard: session harus valid dan facilitator_id harus milik user yang login
    const sessionUserId = getSessionParticipantId(request);
    if (!sessionUserId || sessionUserId !== facilitator_id) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    // 1. Ambil data batch upload untuk memvalidasi kepemilikan dan mendapatkan nama file
    const { data: batch, error: getBatchErr } = await supabase
      .from('upload_history')
      .select('*')
      .eq('id', batch_id)
      .eq('facilitator_id', facilitator_id)
      .maybeSingle();

    if (getBatchErr || !batch) {
      return NextResponse.json({ error: 'Batch upload tidak ditemukan.' }, { status: 404 });
    }

    if (batch.status === 'rolled_back') {
      return NextResponse.json({ error: 'Batch ini sudah di-rollback sebelumnya.' }, { status: 400 });
    }

    // 2. Hapus seluruh anggota bimbingan yang BARU TERDAFTAR lewat batch ini
    const { error: deleteErr, count } = await supabase
      .from('facilitator_members')
      .delete({ count: 'exact' })
      .eq('facilitator_id', facilitator_id)
      .eq('created_by_batch_id', batch_id);

    if (deleteErr) throw deleteErr;

    // 3. Update status batch di upload_history
    const { error: updateErr } = await supabase
      .from('upload_history')
      .update({ status: 'rolled_back' })
      .eq('id', batch_id);

    if (updateErr) throw updateErr;

    // 4. Log audit rollback
    await createAuditLog(facilitator_id, 'Rollback CSV', {
      filename: batch.filename,
      deleted_count: count ?? 0,
      batch_id
    });

    return NextResponse.json({ success: true, deletedCount: count ?? 0 });
  } catch (error: any) {
    console.error('POST rollback error:', error);
    return NextResponse.json({ error: 'Gagal melakukan rollback data unggahan.' }, { status: 500 });
  }
}
