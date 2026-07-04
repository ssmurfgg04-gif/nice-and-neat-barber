// Seed Nice & Neat Barber Shop with demo data
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Check if shop already exists — DON'T re-seed if data exists
    const existing = await db.shop.findFirst();
    if (existing) {
      return NextResponse.json({ message: 'Database already has data', shopId: existing.id });
    }

    // Create shop
    const shop = await db.shop.create({
      data: {
        name: 'Nice & Neat',
        tagline: 'Premium Barber Shop',
        phone: '254712345678',
        email: 'hello@niceandneat.co.ke',
        address: 'Westlands Road, Nairobi, Kenya',
        location: 'Westlands, Nairobi',
        ownerName: 'James Mwangi',
        receiptFooter: 'Thank you for choosing Nice & Neat! See you soon.',
        currency: 'KES',
        language: 'en',
      },
    });

    // === SERVICES ===
    const services = await Promise.all([
      db.service.create({ data: { shopId: shop.id, name: 'Classic Haircut', category: 'Haircut', price: 500, duration: 30 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Skin Fade', category: 'Haircut', price: 800, duration: 45 } }),
      db.service.create({ data: { shopId: shop.id, name: "Kids Haircut (Under 12)", category: 'Kids', price: 300, duration: 20 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Beard Trim & Shape', category: 'Beard', price: 300, duration: 20 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Hot Towel Shave', category: 'Shave', price: 400, duration: 30 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Haircut + Beard', category: 'Package', price: 700, duration: 50 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Haircut + Shave', category: 'Package', price: 850, duration: 60 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Hair Wash & Style', category: 'Style', price: 350, duration: 25 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Head Shave (Clean)', category: 'Shave', price: 500, duration: 30 } }),
      db.service.create({ data: { shopId: shop.id, name: 'Hair Coloring', category: 'Style', price: 1500, duration: 90 } }),
    ]);

    // === PRODUCTS (Retail) ===
    const products = await Promise.all([
      db.product.create({ data: { shopId: shop.id, name: 'Suavecito Pomade (Strong)', category: 'Styling', price: 1200, costPrice: 800, quantity: 15, reorderLevel: 5, unit: 'jar' } }),
      db.product.create({ data: { shopId: shop.id, name: 'Beard Oil - Sandalwood', category: 'Grooming', price: 800, costPrice: 500, quantity: 12, reorderLevel: 4, unit: 'bottle' } }),
      db.product.create({ data: { shopId: shop.id, name: 'Aftershave Balm', category: 'Aftercare', price: 600, costPrice: 350, quantity: 8, reorderLevel: 3, unit: 'bottle' } }),
      db.product.create({ data: { shopId: shop.id, name: 'Hair Gel - Extra Hold', category: 'Styling', price: 450, costPrice: 250, quantity: 3, reorderLevel: 5, unit: 'tube' } }),
      db.product.create({ data: { shopId: shop.id, name: 'Comb Set (Professional)', category: 'Supply', price: 350, costPrice: 200, quantity: 20, reorderLevel: 5, unit: 'set' } }),
    ]);

    // === BARBERS ===
    const barbers = await Promise.all([
      db.barber.create({ data: { shopId: shop.id, name: 'James Mwangi', phone: '254712345678', role: 'owner', commissionType: 'percentage', commissionValue: 100 } }),
      db.barber.create({ data: { shopId: shop.id, name: 'Peter Otieno', phone: '254722111222', role: 'barber', commissionType: 'percentage', commissionValue: 60 } }),
      db.barber.create({ data: { shopId: shop.id, name: 'David Kamau', phone: '254733333444', role: 'barber', commissionType: 'percentage', commissionValue: 55 } }),
      db.barber.create({ data: { shopId: shop.id, name: 'Brian Ochieng', phone: '254744555666', role: 'apprentice', commissionType: 'percentage', commissionValue: 40 } }),
    ]);

    // === CLIENTS ===
    const clients = await Promise.all([
      db.client.create({ data: { shopId: shop.id, name: 'Michael Jordan', phone: '254700111222', notes: 'Likes skin fade, tight on sides' } }),
      db.client.create({ data: { shopId: shop.id, name: 'Stephen Curry', phone: '254700333444', notes: 'Classic cut, no clippers on top' } }),
      db.client.create({ data: { shopId: shop.id, name: 'LeBron James', phone: '254700555666', notes: 'Beard trim every 2 weeks' } }),
      db.client.create({ data: { shopId: shop.id, name: 'Kevin Durant', phone: '254700777888', notes: 'Prefers morning appointments' } }),
      db.client.create({ data: { shopId: shop.id, name: 'Chris Paul', phone: '254700999000' } }),
    ]);

    // === SALES (Last 7 days of demo data) ===
    const now = new Date();
    const salesData: any[] = [];

    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - dayOffset);
      saleDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      // Skip some days (shop closed on Sunday)
      if (saleDate.getDay() === 0 && dayOffset > 0) continue;

      // 8-15 sales per day
      const numSales = 8 + Math.floor(Math.random() * 8);
      for (let i = 0; i < numSales; i++) {
        const svc = services[Math.floor(Math.random() * services.length)];
        const barber = barbers[Math.floor(Math.random() * barbers.length)];
        const client = Math.random() > 0.4 ? clients[Math.floor(Math.random() * clients.length)] : null;
        const paymentMethod = Math.random() > 0.6 ? 'mpesa' : 'cash';
        const time = new Date(saleDate);
        time.setHours(9 + i, (i * 37) % 60, 0, 0);

        salesData.push({
          shopId: shop.id,
          clientId: client?.id || null,
          barberId: barber.id,
          invoiceNumber: `NN-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}-${String(salesData.length + 1).padStart(3, '0')}`,
          subtotal: svc.price,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: svc.price,
          paymentMethod,
          mpesaRef: paymentMethod === 'mpesa' ? `QFG${Math.random().toString(36).substring(2, 8).toUpperCase()}` : null,
          status: 'completed',
          saleDate: time,
        });
      }
    }

    // Create sales with items
    for (const sd of salesData) {
      const sale = await db.sale.create({ data: sd });
      // Get the service to snapshot name
      const svc = services.find(s => s.price === sd.subtotal) || services[0];
      await db.saleItem.create({
        data: {
          saleId: sale.id,
          itemType: 'service',
          itemId: svc.id,
          itemName: svc.name,
          price: svc.price,
          quantity: 1,
          lineTotal: svc.price,
        }
      });
      // Update client stats
      if (sd.clientId) {
        const client = await db.client.findUnique({ where: { id: sd.clientId } });
        if (client) {
          await db.client.update({
            where: { id: client.id },
            data: {
              totalVisits: client.totalVisits + 1,
              totalSpent: client.totalSpent + sd.totalAmount,
              loyaltyPoints: client.loyaltyPoints + 1,
              lastVisitAt: sd.saleDate,
            }
          });
        }
      }
    }

    // === EXPENSES ===
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Rent (monthly recurring)
    await db.expense.create({ data: { shopId: shop.id, category: 'rent', description: `Shop rent - ${lastMonth.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}`, amount: 25000, paymentMethod: 'bank', vendor: 'Westlands Properties Ltd', expenseDate: lastMonth, isRecurring: true, recurringType: 'monthly' } });
    await db.expense.create({ data: { shopId: shop.id, category: 'rent', description: `Shop rent - ${thisMonth.toLocaleString('en-KE', { month: 'long', year: 'numeric' })}`, amount: 25000, paymentMethod: 'bank', vendor: 'Westlands Properties Ltd', expenseDate: thisMonth, isRecurring: true, recurringType: 'monthly' } });

    // Utilities
    await db.expense.create({ data: { shopId: shop.id, category: 'utilities', description: 'Electricity bill', amount: 3500, paymentMethod: 'mpesa', vendor: 'Kenya Power', expenseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'utilities', description: 'Water bill', amount: 800, paymentMethod: 'cash', expenseDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'utilities', description: 'Internet (Fibre)', amount: 2500, paymentMethod: 'mpesa', vendor: 'Safaricom', expenseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), isRecurring: true, recurringType: 'monthly' } });

    // Supplies
    await db.expense.create({ data: { shopId: shop.id, category: 'supplies', description: 'Clipper blades x10', amount: 1800, paymentMethod: 'cash', vendor: 'Barber Supply KE', expenseDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'supplies', description: 'Towels x20', amount: 2000, paymentMethod: 'mpesa', expenseDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'supplies', description: 'Capes x5', amount: 1500, paymentMethod: 'cash', expenseDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'supplies', description: 'Dettol & cleaning supplies', amount: 600, paymentMethod: 'cash', expenseDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) } });

    // Salaries (last month + this month)
    await db.expense.create({ data: { shopId: shop.id, category: 'salaries', description: 'Barber commissions - last month', amount: 18000, paymentMethod: 'mpesa', expenseDate: lastMonth, isRecurring: true, recurringType: 'monthly' } });

    // Inventory restock
    await db.expense.create({ data: { shopId: shop.id, category: 'inventory', description: 'Pomade restock x10 jars', amount: 8000, paymentMethod: 'mpesa', vendor: 'Barber Supply KE', expenseDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) } });

    // Misc
    await db.expense.create({ data: { shopId: shop.id, category: 'misc', description: 'Tea & snacks for clients', amount: 500, paymentMethod: 'cash', expenseDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) } });
    await db.expense.create({ data: { shopId: shop.id, category: 'marketing', description: 'Instagram ads', amount: 2000, paymentMethod: 'mpesa', expenseDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) } });

    return NextResponse.json({
      success: true,
      message: 'Nice & Neat demo data loaded successfully',
      shopId: shop.id,
      counts: { services: services.length, products: products.length, barbers: barbers.length, clients: clients.length, sales: salesData.length },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
