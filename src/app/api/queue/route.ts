// Walk-In Queue API
// Most barbershops are walk-in dominant — queue management is critical
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const queue = await db.walkInQueue.findMany({
      where: { shopId, status: 'waiting' },
      orderBy: { position: 'asc' },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStats = await db.walkInQueue.aggregate({
      where: { shopId, checkInTime: { gte: today } },
      _count: true,
    });
    const seatedToday = await db.walkInQueue.aggregate({
      where: { shopId, status: 'seated', checkInTime: { gte: today } },
      _count: true,
    });
    const noShowToday = await db.walkInQueue.aggregate({
      where: { shopId, status: 'no_show', checkInTime: { gte: today } },
      _count: true,
    });

    // Avg wait time today
    const seatedRecords = await db.walkInQueue.findMany({
      where: { shopId, status: 'seated', seatedTime: { not: null }, checkInTime: { gte: today } },
      select: { checkInTime: true, seatedTime: true },
    });
    const avgWait = seatedRecords.length > 0
      ? Math.round(seatedRecords.reduce((sum, r) => {
          const wait = (r.seatedTime!.getTime() - r.checkInTime.getTime()) / 60000;
          return sum + wait;
        }, 0) / seatedRecords.length)
      : 0;

    return NextResponse.json({
      queue,
      stats: {
        waiting: queue.length,
        totalToday: todayStats._count,
        seatedToday: seatedToday._count,
        noShowToday: noShowToday._count,
        avgWaitMinutes: avgWait,
        noShowRate: todayStats._count > 0 ? Math.round((noShowToday._count / todayStats._count) * 100) : 0,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, clientName, clientPhone, partySize, preferredBarberId, notes } = body;

    if (!shopId || !clientName) return NextResponse.json({ error: 'shopId and clientName required' }, { status: 400 });

    // Get next position
    const maxPos = await db.walkInQueue.findFirst({
      where: { shopId, status: 'waiting' },
      orderBy: { position: 'desc' },
    });
    const position = (maxPos?.position || 0) + 1;

    const entry = await db.walkInQueue.create({
      data: { shopId, clientName, clientPhone, partySize: parseInt(partySize) || 1, preferredBarberId: preferredBarberId || null, notes: notes || null, position },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action } = body;
    if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

    if (action === 'seat') {
      const entry = await db.walkInQueue.findUnique({ where: { id } });
      if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const seatedTime = new Date();
      const waitMinutes = Math.round((seatedTime.getTime() - entry.checkInTime.getTime()) / 60000);
      const updated = await db.walkInQueue.update({ where: { id }, data: { status: 'seated', seatedTime, waitMinutes } });
      // Reindex remaining queue positions
      const remaining = await db.walkInQueue.findMany({ where: { shopId: entry.shopId, status: 'waiting' }, orderBy: { position: 'asc' } });
      for (let i = 0; i < remaining.length; i++) {
        await db.walkInQueue.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
      }
      return NextResponse.json({ success: true, entry: updated, waitMinutes });
    }

    if (action === 'no_show') {
      const updated = await db.walkInQueue.update({ where: { id }, data: { status: 'no_show' } });
      // Reindex remaining
      const entry = await db.walkInQueue.findUnique({ where: { id } });
      if (entry) {
        const remaining = await db.walkInQueue.findMany({ where: { shopId: entry.shopId, status: 'waiting' }, orderBy: { position: 'asc' } });
        for (let i = 0; i < remaining.length; i++) {
          await db.walkInQueue.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
        }
      }
      return NextResponse.json({ success: true, entry: updated });
    }

    if (action === 'cancel') {
      const updated = await db.walkInQueue.update({ where: { id }, data: { status: 'cancelled' } });
      const entry = await db.walkInQueue.findUnique({ where: { id } });
      if (entry) {
        const remaining = await db.walkInQueue.findMany({ where: { shopId: entry.shopId, status: 'waiting' }, orderBy: { position: 'asc' } });
        for (let i = 0; i < remaining.length; i++) {
          await db.walkInQueue.update({ where: { id: remaining[i].id }, data: { position: i + 1 } });
        }
      }
      return NextResponse.json({ success: true, entry: updated });
    }

    return NextResponse.json({ error: 'Invalid action. Use seat, no_show, or cancel' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
