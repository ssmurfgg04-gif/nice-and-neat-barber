import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  const search = searchParams.get('search');
  if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

  const where: any = { shopId };
  if (search) {
    where.OR = [{ name: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }, { notes: { contains: search } }];
  }

  const clients = await db.client.findMany({
    where, orderBy: { totalVisits: 'desc' },
    include: { sales: { orderBy: { saleDate: 'desc' }, take: 10, include: { items: true, barber: true } } },
  });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, phone, email, notes } = body;
    if (!shopId || !name) return NextResponse.json({ error: 'shopId and name required' }, { status: 400 });
    const client = await db.client.create({ data: { shopId, name, phone: phone || null, email: email || null, notes: notes || null } });
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const client = await db.client.update({ where: { id }, data: updates });
    return NextResponse.json(client);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
