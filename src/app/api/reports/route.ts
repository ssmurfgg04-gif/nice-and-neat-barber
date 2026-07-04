// Reports API — daily, weekly, monthly summaries with date range filtering
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const period = searchParams.get('period') || 'daily'; // daily | weekly | monthly
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);

    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      endDate.setHours(23, 59, 59, 999);
    }

    // Get sales and expenses in range
    const [sales, expenses] = await Promise.all([
      db.sale.findMany({
        where: { shopId, saleDate: { gte: startDate, lte: endDate }, status: 'completed' },
        include: { items: true, client: true, barber: true },
        orderBy: { saleDate: 'desc' },
      }),
      db.expense.findMany({
        where: { shopId, expenseDate: { gte: startDate, lte: endDate } },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const totalSales = sales.reduce((s, sale) => s + sale.totalAmount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? Math.round((netProfit / totalSales) * 100) : 0;

    // Group by day for trend
    const dayMap = new Map<string, { date: string; sales: number; expenses: number; profit: number; salesCount: number }>();
    sales.forEach(sale => {
      const dateKey = sale.saleDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      const existing = dayMap.get(dateKey) || { date: dateKey, sales: 0, expenses: 0, profit: 0, salesCount: 0 };
      existing.sales += sale.totalAmount;
      existing.salesCount += 1;
      dayMap.set(dateKey, existing);
    });
    expenses.forEach(exp => {
      const dateKey = exp.expenseDate.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
      const existing = dayMap.get(dateKey) || { date: dateKey, sales: 0, expenses: 0, profit: 0, salesCount: 0 };
      existing.expenses += exp.amount;
      dayMap.set(dateKey, existing);
    });
    const trend = Array.from(dayMap.values()).map(d => ({ ...d, profit: d.sales - d.expenses }));

    // Service breakdown
    const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.itemType === 'service') {
          const existing = serviceMap.get(item.itemName) || { name: item.itemName, count: 0, revenue: 0 };
          existing.count += item.quantity;
          existing.revenue += item.lineTotal;
          serviceMap.set(item.itemName, existing);
        }
      });
    });
    const serviceBreakdown = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Expense category breakdown
    const expenseMap = new Map<string, number>();
    expenses.forEach(e => {
      expenseMap.set(e.category, (expenseMap.get(e.category) || 0) + e.amount);
    });
    const expenseBreakdown = Array.from(expenseMap.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);

    // Barber performance
    const barberMap = new Map<string, { name: string; sales: number; revenue: number; commission: number }>();
    sales.forEach(sale => {
      if (!sale.barber) return;
      const existing = barberMap.get(sale.barber.id) || { name: sale.barber.name, sales: 0, revenue: 0, commission: 0 };
      existing.sales += 1;
      existing.revenue += sale.totalAmount;
      const comm = sale.barber.commissionType === 'percentage'
        ? (sale.totalAmount * sale.barber.commissionValue / 100)
        : sale.barber.commissionValue;
      existing.commission += comm;
      barberMap.set(sale.barber.id, existing);
    });
    const barberBreakdown = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

    // Payment method breakdown
    const paymentMap = { cash: 0, mpesa: 0, card: 0 };
    sales.forEach(s => { paymentMap[s.paymentMethod as keyof typeof paymentMap] = (paymentMap[s.paymentMethod as keyof typeof paymentMap] || 0) + s.totalAmount; });

    return NextResponse.json({
      period,
      range: { from: startDate.toISOString(), to: endDate.toISOString() },
      summary: {
        totalSales, totalExpenses, netProfit, profitMargin,
        salesCount: sales.length, expenseCount: expenses.length,
        avgSaleValue: sales.length > 0 ? totalSales / sales.length : 0,
      },
      trend,
      serviceBreakdown,
      expenseBreakdown,
      barberBreakdown,
      paymentBreakdown: paymentMap,
      sales,
      expenses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
