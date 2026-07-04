import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get('shopId');
  if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });
  const barbers = await db.barber.findMany({ where: { shopId, isActive: true }, orderBy: { name: 'asc' } });
  return NextResponse.json(barbers);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, phone, role, commissionType, commissionValue } = body;
    if (!shopId || !name) return NextResponse.json({ error: 'shopId and name required' }, { status: 400 });
    const barber = await db.barber.create({ data: { shopId, name, phone: phone || null, role: role || 'barber', commissionType: commissionType || 'percentage', commissionValue: parseFloat(commissionValue) || 60 } });
    return NextResponse.json(barber, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (updates.commissionValue) updates.commissionValue = parseFloat(updates.commissionValue);
    const barber = await db.barber.update({ where: { id }, data: updates });
    return NextResponse.json(barber);
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.barber.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
