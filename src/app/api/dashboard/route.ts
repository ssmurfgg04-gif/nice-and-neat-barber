// Dashboard API — barber shop analytics
import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');
    if (!shopId) return NextResponse.json({ error: 'shopId required' }, { status: 400 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday start
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // === SALES QUERIES ===
    const [todaySales, weekSales, monthSales, allSales] = await Promise.all([
      db.sale.findMany({ where: { shopId, saleDate: { gte: todayStart }, status: 'completed' }, include: { items: true, client: true, barber: true } }),
      db.sale.findMany({ where: { shopId, saleDate: { gte: weekStart }, status: 'completed' }, include: { items: true } }),
      db.sale.findMany({ where: { shopId, saleDate: { gte: monthStart }, status: 'completed' }, include: { items: true } }),
      db.sale.findMany({ where: { shopId, status: 'completed' }, include: { items: true }, orderBy: { saleDate: 'desc' }, take: 50 }),
    ]);

    const sumAmount = (sales: any[]) => sales.reduce((s, sale) => s + sale.totalAmount, 0);

    // === EXPENSES ===
    const [todayExpenses, weekExpenses, monthExpenses] = await Promise.all([
      db.expense.findMany({ where: { shopId, expenseDate: { gte: todayStart } } }),
      db.expense.findMany({ where: { shopId, expenseDate: { gte: weekStart } } }),
      db.expense.findMany({ where: { shopId, expenseDate: { gte: monthStart } } }),
    ]);

    const sumExpenses = (expenses: any[]) => expenses.reduce((s, e) => s + e.amount, 0);

    // === 7-DAY TREND ===
    const dailyTrend: { date: string; sales: number; expenses: number; profit: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(todayStart);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const daySales = await db.sale.findMany({ where: { shopId, saleDate: { gte: dayStart, lt: dayEnd }, status: 'completed' } });
      const dayExpenses = await db.expense.findMany({ where: { shopId, expenseDate: { gte: dayStart, lt: dayEnd } } });
      const salesTotal = sumAmount(daySales);
      const expTotal = sumExpenses(dayExpenses);

      dailyTrend.push({
        date: dayStart.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' }),
        sales: salesTotal,
        expenses: expTotal,
        profit: salesTotal - expTotal,
        count: daySales.length,
      });
    }

    // === TOP SERVICES (this month) ===
    const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
    monthSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.itemType === 'service') {
          const existing = serviceMap.get(item.itemName) || { name: item.itemName, count: 0, revenue: 0 };
          existing.count += item.quantity;
          existing.revenue += item.lineTotal;
          serviceMap.set(item.itemName, existing);
        }
      });
    });
    const topServices = Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // === PAYMENT METHOD BREAKDOWN (this month) ===
    const paymentBreakdown = {
      cash: monthSales.filter(s => s.paymentMethod === 'cash').reduce((s, sale) => s + sale.totalAmount, 0),
      mpesa: monthSales.filter(s => s.paymentMethod === 'mpesa').reduce((s, sale) => s + sale.totalAmount, 0),
      card: monthSales.filter(s => s.paymentMethod === 'card').reduce((s, sale) => s + sale.totalAmount, 0),
    };

    // === BARBER PERFORMANCE (this month) ===
    const barberMap = new Map<string, { name: string; sales: number; revenue: number; commission: number }>();
    const barbers = await db.barber.findMany({ where: { shopId, isActive: true } });
    const barberSales = await db.sale.findMany({ where: { shopId, saleDate: { gte: monthStart }, status: 'completed' }, include: { barber: true } });
    barberSales.forEach(sale => {
      if (!sale.barber) return;
      const existing = barberMap.get(sale.barber.id) || { name: sale.barber.name, sales: 0, revenue: 0, commission: 0 };
      existing.sales += 1;
      existing.revenue += sale.totalAmount;
      // Calculate commission
      const commission = sale.barber.commissionType === 'percentage'
        ? (sale.totalAmount * sale.barber.commissionValue / 100)
        : sale.barber.commissionValue;
      existing.commission += commission;
      barberMap.set(sale.barber.id, existing);
    });
    const barberPerformance = Array.from(barberMap.values()).sort((a, b) => b.revenue - a.revenue);

    // === EXPENSE BREAKDOWN (this month) ===
    const expenseCategories = ['rent', 'utilities', 'supplies', 'salaries', 'inventory', 'maintenance', 'marketing', 'misc'];
    const expenseBreakdown = expenseCategories.map(cat => ({
      category: cat,
      amount: monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    })).filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount);

    // === LOW STOCK ALERTS ===
    const lowStockProducts = await db.product.findMany({ where: { shopId, isActive: true, quantity: { lte: db.product.fields.reorderLevel } } });

    // === RECENT SALES ===
    const recentSales = allSales.slice(0, 10);

    // === STATS SUMMARY ===
    const totalClients = await db.client.count({ where: { shopId } });
    const totalServices = await db.service.count({ where: { shopId, isActive: true } });
    const totalProducts = await db.product.count({ where: { shopId, isActive: true } });
    const totalBarbers = await db.barber.count({ where: { shopId, isActive: true } });

    const todayProfit = sumAmount(todaySales) - sumExpenses(todayExpenses);
    const monthProfit = sumAmount(monthSales) - sumExpenses(monthExpenses);

    return NextResponse.json({
      sales: {
        today: { amount: sumAmount(todaySales), count: todaySales.length, avg: todaySales.length > 0 ? sumAmount(todaySales) / todaySales.length : 0 },
        week: { amount: sumAmount(weekSales), count: weekSales.length },
        month: { amount: sumAmount(monthSales), count: monthSales.length },
      },
      expenses: {
        today: sumExpenses(todayExpenses),
        week: sumExpenses(weekExpenses),
        month: sumExpenses(monthExpenses),
        breakdown: expenseBreakdown,
      },
      profit: {
        today: todayProfit,
        week: sumAmount(weekSales) - sumExpenses(weekExpenses),
        month: monthProfit,
      },
      dailyTrend,
      topServices,
      paymentBreakdown,
      barberPerformance,
      lowStockProducts,
      recentSales,
      stats: { totalClients, totalServices, totalProducts, totalBarbers },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
