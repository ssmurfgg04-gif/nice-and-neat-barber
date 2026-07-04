// Expenses API — CRUD with date filtering & search
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const where: any = { shopId };
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      if (to) where.expenseDate.lte = new Date(to + 'T23:59:59');
    }
    if (category && category !== 'all') where.category = category;
    if (search) {
      where.OR = [
        { description: { contains: search } },
        { vendor: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const expenses = await db.expense.findMany({ where, orderBy: { expenseDate: 'desc' }, take: limit });
    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, category, description, amount, paymentMethod, vendor, expenseDate, isRecurring, recurringType, notes } = body;

    if (!shopId || !description || !amount) {
      return NextResponse.json({ error: 'shopId, description, and amount required' }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        shopId, category: category || 'misc', description,
        amount: parseFloat(amount), paymentMethod: paymentMethod || 'cash',
        vendor: vendor || null, expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        isRecurring: isRecurring || false, recurringType: recurringType || null, notes: notes || null,
      }
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    await db.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
