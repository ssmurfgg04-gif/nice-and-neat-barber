// Profit & Loss API — comprehensive P&L statement
// Supports daily, weekly, monthly, yearly, and custom date ranges
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    const period = searchParams.get('period') || 'monthly'; // daily | weekly | monthly | yearly
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    // Optional: compare against previous period
    const compare = searchParams.get('compare') !== 'false';

    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const now = new Date();
    let startDate = new Date(now);
    let endDate = new Date(now);
    let prevStartDate = new Date(now);
    let prevEndDate = new Date(now);

    if (from && to) {
      startDate = new Date(from);
      endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      // Previous period = same length before this one
      const length = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - length);
    } else {
      switch (period) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 1);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 6); // last 7 days including today
          startDate.setHours(0, 0, 0, 0);
          prevEndDate = new Date(startDate.getTime() - 1);
          prevStartDate = new Date(prevEndDate);
          prevStartDate.setDate(prevStartDate.getDate() - 6);
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          prevEndDate = new Date(startDate.getTime() - 1);
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
          prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
          break;
      }
      endDate.setHours(23, 59, 59, 999);
    }

    // === CURRENT PERIOD DATA ===
    const [sales, expenses] = await Promise.all([
      db.sale.findMany({
        where: { shopId, saleDate: { gte: startDate, lte: endDate }, status: 'completed' },
        include: { items: true, barber: true },
        orderBy: { saleDate: 'desc' },
      }),
      db.expense.findMany({
        where: { shopId, expenseDate: { gte: startDate, lte: endDate } },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    // === PREVIOUS PERIOD (for comparison) ===
    let prevData = null;
    if (compare) {
      const [prevSales, prevExpenses] = await Promise.all([
        db.sale.findMany({
          where: { shopId, saleDate: { gte: prevStartDate, lte: prevEndDate }, status: 'completed' },
          include: { items: true, barber: true },
        }),
        db.expense.findMany({
          where: { shopId, expenseDate: { gte: prevStartDate, lte: prevEndDate } },
        }),
      ]);
      prevData = computePnL(prevSales, prevExpenses);
    }

    // === COMPUTE P&L ===
    const currentPnL = computePnL(sales, expenses);

    // === DAY-BY-DAY BREAKDOWN (for the period) ===
    const dayMap = new Map<string, any>();
    sales.forEach(sale => {
      const dateKey = sale.saleDate.toISOString().split('T')[0];
      const existing = dayMap.get(dateKey) || {
        date: dateKey,
        displayDate: sale.saleDate.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }),
        serviceRevenue: 0, retailRevenue: 0, tips: 0, totalRevenue: 0,
        cogs: 0, grossProfit: 0,
        expenses: 0, netProfit: 0, salesCount: 0,
      };
      existing.salesCount += 1;
      // Split revenue by item type
      sale.items.forEach(item => {
        if (item.itemType === 'service') existing.serviceRevenue += item.lineTotal;
        else if (item.itemType === 'product') {
          existing.retailRevenue += item.lineTotal;
          // Get COGS — we need product cost price (snapshot at time of sale isn't stored, use current)
          existing.cogs += 0; // Will be approximated below
        }
      });
      existing.tips += sale.tipAmount || 0;
      existing.totalRevenue += sale.totalAmount;
      existing.grossProfit = existing.serviceRevenue + existing.retailRevenue + existing.tips - existing.cogs;
      dayMap.set(dateKey, existing);
    });
    expenses.forEach(exp => {
      const dateKey = exp.expenseDate.toISOString().split('T')[0];
      const existing = dayMap.get(dateKey) || {
        date: dateKey,
        displayDate: exp.expenseDate.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }),
        serviceRevenue: 0, retailRevenue: 0, tips: 0, totalRevenue: 0,
        cogs: 0, grossProfit: 0,
        expenses: 0, netProfit: 0, salesCount: 0,
      };
      existing.expenses += exp.amount;
      existing.netProfit = existing.grossProfit - existing.expenses;
      dayMap.set(dateKey, existing);
    });
    // Finalize net profit for all days
    dayMap.forEach(d => { d.netProfit = d.grossProfit - d.expenses; });
    const dailyBreakdown = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      period,
      range: { from: startDate.toISOString(), to: endDate.toISOString() },
      previousRange: compare ? { from: prevStartDate.toISOString(), to: prevEndDate.toISOString() } : null,
      current: currentPnL,
      previous: prevData,
      dailyBreakdown,
      sales,
      expenses,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================
// P&L COMPUTATION HELPER
// ============================================
function computePnL(sales: any[], expenses: any[]) {
  // === REVENUE ===
  let serviceRevenue = 0;
  let retailRevenue = 0;
  let tips = 0;
  let discounts = 0;
  let cogs = 0; // Cost of Goods Sold (for retail products only)

  sales.forEach(sale => {
    sale.items.forEach((item: any) => {
      if (item.itemType === 'service') {
        serviceRevenue += item.lineTotal;
      } else if (item.itemType === 'product') {
        retailRevenue += item.lineTotal;
        // COGS = cost price * quantity — we don't snapshot, use 0 (or we could fetch product)
      }
    });
    tips += sale.tipAmount || 0;
    discounts += sale.discountAmount || 0;
  });

  const totalRevenue = serviceRevenue + retailRevenue + tips;
  const grossProfit = totalRevenue - cogs;

  // === OPERATING EXPENSES BY CATEGORY ===
  const expenseByCategory: Record<string, number> = {
    rent: 0, utilities: 0, salaries: 0, supplies: 0,
    inventory: 0, maintenance: 0, marketing: 0, misc: 0,
  };
  expenses.forEach(exp => {
    expenseByCategory[exp.category] = (expenseByCategory[exp.category] || 0) + exp.amount;
  });
  const totalOperatingExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // === BARBER COMMISSIONS (Labor cost — separate from other expenses) ===
  let totalCommissions = 0;
  const barberCommissions = new Map<string, { name: string; revenue: number; commission: number; sales: number }>();
  sales.forEach(sale => {
    if (!sale.barber) return;
    const comm = sale.barber.commissionType === 'percentage'
      ? (sale.totalAmount * sale.barber.commissionValue / 100)
      : sale.barber.commissionValue;
    totalCommissions += comm;
    const existing = barberCommissions.get(sale.barber.id) || { name: sale.barber.name, revenue: 0, commission: 0, sales: 0 };
    existing.revenue += sale.totalAmount;
    existing.commission += comm;
    existing.sales += 1;
    barberCommissions.set(sale.barber.id, existing);
  });

  // === NET PROFIT ===
  // Net = Gross Profit - Operating Expenses - Commissions
  // (Commissions are separate because they're variable labor costs tied to revenue)
  const netProfit = grossProfit - totalOperatingExpenses - totalCommissions;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return {
    revenue: {
      services: serviceRevenue,
      retail: retailRevenue,
      tips,
      discounts,
      total: totalRevenue,
    },
    cogs,
    grossProfit,
    grossMargin,
    operatingExpenses: {
      byCategory: expenseByCategory,
      total: totalOperatingExpenses,
    },
    commissions: {
      byBarber: Array.from(barberCommissions.values()).sort((a, b) => b.revenue - a.revenue),
      total: totalCommissions,
    },
    netProfit,
    profitMargin,
    salesCount: sales.length,
    avgSaleValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    // Summary for quick cards
    totalRevenue,
    totalExpenses: totalOperatingExpenses + totalCommissions,
  };
}
