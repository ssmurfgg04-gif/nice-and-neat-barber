// Sales API — create sales, list with date filtering & search
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const paymentMethod = searchParams.get('paymentMethod');
    const barberId = searchParams.get('barberId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const where: any = { shopId, status: 'completed' };
    if (from || to) {
      where.saleDate = {};
      if (from) where.saleDate.gte = new Date(from);
      if (to) where.saleDate.lte = new Date(to + 'T23:59:59');
    }
    if (paymentMethod && paymentMethod !== 'all') where.paymentMethod = paymentMethod;
    if (barberId && barberId !== 'all') where.barberId = barberId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        { mpesaRef: { contains: search } },
        { client: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const sales = await db.sale.findMany({
      where,
      orderBy: { saleDate: 'desc' },
      take: limit,
      include: { items: true, client: true, barber: true },
    });

    return NextResponse.json(sales);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, items, clientId, barberId, paymentMethod, mpesaRef, discountAmount, notes } = body;

    if (!shopId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'shopId and items array required' }, { status: 400 });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }
    const discount = parseFloat(discountAmount) || 0;
    const totalAmount = subtotal - discount;

    // Generate invoice number
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const todayCount = await db.sale.count({ where: { shopId, saleDate: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } } });
    const invoiceNumber = `NN-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

    // Create sale
    const sale = await db.sale.create({
      data: {
        shopId, clientId: clientId || null, barberId: barberId || null,
        invoiceNumber, subtotal, taxAmount: 0, discountAmount: discount,
        totalAmount, paymentMethod: paymentMethod || 'cash',
        mpesaRef: mpesaRef || null, notes: notes || null,
        status: 'completed', saleDate: new Date(),
        items: { create: items.map((item: any) => ({ itemType: item.itemType, itemId: item.itemId, itemName: item.itemName, price: item.price, quantity: item.quantity, lineTotal: item.price * item.quantity })) },
      },
      include: { items: true },
    });

    // Update product stock if retail items sold
    for (const item of items) {
      if (item.itemType === 'product') {
        await db.product.update({ where: { id: item.itemId }, data: { quantity: { decrement: item.quantity } } });
      }
    }

    // Update client stats
    if (clientId) {
      const client = await db.client.findUnique({ where: { id: clientId } });
      if (client) {
        await db.client.update({
          where: { id: clientId },
          data: {
            totalVisits: client.totalVisits + 1,
            totalSpent: client.totalSpent + totalAmount,
            loyaltyPoints: client.loyaltyPoints + 1,
            lastVisitAt: new Date(),
          }
        });
      }
    }

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
