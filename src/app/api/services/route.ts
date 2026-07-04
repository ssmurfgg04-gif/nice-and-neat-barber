import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });
  const services = await db.service.findMany({ where: { shopId, isActive: true }, orderBy: { category: 'asc' } });
  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, category, price, duration } = body;
    if (!shopId || !name || !price) return NextResponse.json({ error: 'shopId, name, price required' }, { status: 400 });
    const service = await db.service.create({ data: { shopId, name, category: category || 'Haircut', price: parseFloat(price), duration: parseInt(duration) || 30 } });
    return NextResponse.json(service, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.duration) updates.duration = parseInt(updates.duration);
    const service = await db.service.update({ where: { id }, data: updates });
    return NextResponse.json(service);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.service.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
