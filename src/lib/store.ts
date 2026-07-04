// ============================================
// NICE & NEAT — CLIENT-SIDE DATA STORE
// All data persists in localStorage (phone storage)
// No server, no database — pure client-side, works offline
// ============================================

export interface Shop {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  location: string;
  ownerName: string;
  receiptFooter: string;
  currency: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  quantity: number;
  reorderLevel: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  loyaltyPoints: number;
  totalVisits: number;
  totalSpent: number;
  lastVisitAt: string | null;
  createdAt: string;
}

export interface Barber {
  id: string;
  name: string;
  phone: string;
  role: string;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  createdAt: string;
}

export interface SaleItem {
  itemType: 'service' | 'product';
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  clientId: string | null;
  clientName: string | null;
  barberId: string | null;
  barberName: string | null;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  tipAmount: number;
  totalAmount: number;
  paymentMethod: string;
  mpesaRef: string | null;
  status: string;
  notes: string | null;
  saleDate: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  vendor: string | null;
  expenseDate: string;
  isRecurring: boolean;
  recurringType: string | null;
  notes: string | null;
  createdAt: string;
}

export interface QueueEntry {
  id: string;
  clientName: string;
  clientPhone: string | null;
  partySize: number;
  preferredBarberId: string | null;
  status: string;
  checkInTime: string;
  seatedTime: string | null;
  waitMinutes: number | null;
  notes: string | null;
  position: number;
  createdAt: string;
}

export interface AppData {
  shop: Shop;
  services: Service[];
  products: Product[];
  clients: Client[];
  barbers: Barber[];
  sales: Sale[];
  expenses: Expense[];
  queue: QueueEntry[];
  version: number;
  lastBackup: string | null;
}

const STORAGE_KEY = 'niceAndNeat_data';
const DATA_VERSION = 1;

// ============================================
// DEFAULT DATA (lightweight — only if empty)
// ============================================
function getDefaultData(): AppData {
  const now = new Date().toISOString();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const services: Service[] = [
    { id: 'svc1', name: 'Classic Haircut', category: 'Haircut', price: 500, duration: 30, isActive: true, createdAt: now },
    { id: 'svc2', name: 'Skin Fade', category: 'Haircut', price: 800, duration: 45, isActive: true, createdAt: now },
    { id: 'svc3', name: 'Kids Haircut (Under 12)', category: 'Kids', price: 300, duration: 20, isActive: true, createdAt: now },
    { id: 'svc4', name: 'Beard Trim & Shape', category: 'Beard', price: 300, duration: 20, isActive: true, createdAt: now },
    { id: 'svc5', name: 'Hot Towel Shave', category: 'Shave', price: 400, duration: 30, isActive: true, createdAt: now },
    { id: 'svc6', name: 'Haircut + Beard', category: 'Package', price: 700, duration: 50, isActive: true, createdAt: now },
    { id: 'svc7', name: 'Haircut + Shave', category: 'Package', price: 850, duration: 60, isActive: true, createdAt: now },
    { id: 'svc8', name: 'Hair Wash & Style', category: 'Style', price: 350, duration: 25, isActive: true, createdAt: now },
  ];

  const products: Product[] = [
    { id: 'prod1', name: 'Suavecito Pomade (Strong)', category: 'Styling', price: 1200, costPrice: 800, quantity: 15, reorderLevel: 5, unit: 'jar', isActive: true, createdAt: now },
    { id: 'prod2', name: 'Beard Oil - Sandalwood', category: 'Grooming', price: 800, costPrice: 500, quantity: 12, reorderLevel: 4, unit: 'bottle', isActive: true, createdAt: now },
    { id: 'prod3', name: 'Aftershave Balm', category: 'Aftercare', price: 600, costPrice: 350, quantity: 8, reorderLevel: 3, unit: 'bottle', isActive: true, createdAt: now },
    { id: 'prod4', name: 'Hair Gel - Extra Hold', category: 'Styling', price: 450, costPrice: 250, quantity: 3, reorderLevel: 5, unit: 'tube', isActive: true, createdAt: now },
  ];

  const barbers: Barber[] = [
    { id: 'brb1', name: 'James Mwangi', phone: '254712345678', role: 'owner', commissionType: 'percentage', commissionValue: 100, isActive: true, createdAt: now },
    { id: 'brb2', name: 'Peter Otieno', phone: '254722111222', role: 'barber', commissionType: 'percentage', commissionValue: 60, isActive: true, createdAt: now },
    { id: 'brb3', name: 'David Kamau', phone: '254733333444', role: 'barber', commissionType: 'percentage', commissionValue: 55, isActive: true, createdAt: now },
  ];

  // Light seed: just a few sample sales for today so dashboard isn't empty
  const sales: Sale[] = [];
  const sampleServices = [services[0], services[1], services[5], services[3], services[0]];
  const sampleBarbers = [barbers[1], barbers[2], barbers[1], barbers[0], barbers[2]];
  for (let i = 0; i < 5; i++) {
    const svc = sampleServices[i];
    const brb = sampleBarbers[i];
    const saleTime = new Date(today);
    saleTime.setHours(9 + i * 2, 0, 0, 0);
    sales.push({
      id: `sale_seed_${i}`,
      invoiceNumber: `NN-${todayStr.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
      clientId: null,
      clientName: null,
      barberId: brb.id,
      barberName: brb.name,
      items: [{ itemType: 'service', itemId: svc.id, itemName: svc.name, price: svc.price, quantity: 1, lineTotal: svc.price }],
      subtotal: svc.price,
      discountAmount: 0,
      tipAmount: i === 2 ? 100 : 0,
      totalAmount: svc.price + (i === 2 ? 100 : 0),
      paymentMethod: i % 2 === 0 ? 'cash' : 'mpesa',
      mpesaRef: i % 2 === 0 ? null : `QFG${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      status: 'completed',
      notes: null,
      saleDate: saleTime.toISOString(),
      createdAt: saleTime.toISOString(),
    });
  }

  // Sample expenses for this month
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const expenses: Expense[] = [
    { id: 'exp1', category: 'rent', description: `Shop rent - ${today.toLocaleString('en-KE', { month: 'long' })}`, amount: 25000, paymentMethod: 'bank', vendor: 'Property Ltd', expenseDate: monthStart, isRecurring: true, recurringType: 'monthly', notes: null, createdAt: now },
    { id: 'exp2', category: 'utilities', description: 'Electricity bill', amount: 3500, paymentMethod: 'mpesa', vendor: 'Kenya Power', expenseDate: todayStr, isRecurring: false, recurringType: null, notes: null, createdAt: now },
    { id: 'exp3', category: 'supplies', description: 'Clipper blades x10', amount: 1800, paymentMethod: 'cash', vendor: 'Barber Supply KE', expenseDate: todayStr, isRecurring: false, recurringType: null, notes: null, createdAt: now },
  ];

  return {
    shop: {
      name: 'Nice & Neat',
      tagline: 'Premium Barber Shop',
      phone: '254712345678',
      email: 'hello@niceandneat.co.ke',
      address: 'Westlands Road, Nairobi',
      location: 'Westlands, Nairobi',
      ownerName: 'James Mwangi',
      receiptFooter: 'Thank you for choosing Nice & Neat!',
      currency: 'KES',
      createdAt: now,
    },
    services,
    products,
    clients: [],
    barbers,
    sales,
    expenses,
    queue: [],
    version: DATA_VERSION,
    lastBackup: null,
  };
}

// ============================================
// STORE — load, save, reset
// ============================================
let dataCache: AppData | null = null;

function isClient(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function loadData(): AppData {
  if (dataCache) return dataCache;
  if (!isClient()) {
    // Server-side: return empty defaults (won't be rendered meaningfully)
    return getEmptyData();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      dataCache = JSON.parse(raw);
      return dataCache!;
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  // First run — initialize with defaults
  const defaults = getDefaultData();
  saveData(defaults);
  return defaults;
}

export function saveData(data: AppData): void {
  dataCache = data;
  if (!isClient()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function resetData(): void {
  if (isClient()) localStorage.removeItem(STORAGE_KEY);
  dataCache = null;
  loadData();
}

function getEmptyData(): AppData {
  const now = new Date().toISOString();
  return {
    shop: { name: 'Nice & Neat', tagline: '', phone: '', email: '', address: '', location: '', ownerName: '', receiptFooter: '', currency: 'KES', createdAt: now },
    services: [], products: [], clients: [], barbers: [], sales: [], expenses: [], queue: [],
    version: DATA_VERSION, lastBackup: null,
  };
}

// ============================================
// BACKUP — export & import (JSON)
// ============================================
export function exportData(): string {
  const data = loadData();
  const backup = { ...data, lastBackup: new Date().toISOString() };
  saveData(backup);
  return JSON.stringify(backup, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.shop || !parsed.services || !parsed.sales) {
      throw new Error('Invalid backup file format');
    }
    saveData(parsed);
    return true;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
}

// ============================================
// ID GENERATOR
// ============================================
export function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
}

// ============================================
// CRUD — SALES
// ============================================
export function createSale(saleData: any): Sale {
  const data = loadData();
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const todaySales = data.sales.filter(s => s.saleDate.split('T')[0] === today.toISOString().split('T')[0]);
  const invoiceNumber = `NN-${dateStr}-${String(todaySales.length + 1).padStart(3, '0')}`;

  const sale: Sale = {
    id: generateId(),
    invoiceNumber,
    clientId: saleData.clientId || null,
    clientName: saleData.clientName || null,
    barberId: saleData.barberId || null,
    barberName: saleData.barberName || null,
    items: saleData.items,
    subtotal: saleData.subtotal,
    discountAmount: saleData.discountAmount || 0,
    tipAmount: saleData.tipAmount || 0,
    totalAmount: saleData.totalAmount,
    paymentMethod: saleData.paymentMethod || 'cash',
    mpesaRef: saleData.mpesaRef || null,
    status: 'completed',
    notes: saleData.notes || null,
    saleDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  data.sales.unshift(sale);

  // Update product stock
  saleData.items.forEach((item: SaleItem) => {
    if (item.itemType === 'product') {
      const product = data.products.find(p => p.id === item.itemId);
      if (product) product.quantity = Math.max(0, product.quantity - item.quantity);
    }
  });

  // Update client stats
  if (saleData.clientId) {
    const client = data.clients.find(c => c.id === saleData.clientId);
    if (client) {
      client.totalVisits += 1;
      client.totalSpent += sale.totalAmount;
      client.loyaltyPoints += 1;
      client.lastVisitAt = sale.saleDate;
    }
  }

  saveData(data);
  return sale;
}

// ============================================
// CRUD — EXPENSES
// ============================================
export function createExpense(expData: any): Expense {
  const data = loadData();
  const expense: Expense = {
    id: generateId(),
    category: expData.category || 'misc',
    description: expData.description,
    amount: parseFloat(expData.amount),
    paymentMethod: expData.paymentMethod || 'cash',
    vendor: expData.vendor || null,
    expenseDate: expData.expenseDate || new Date().toISOString().split('T')[0],
    isRecurring: expData.isRecurring || false,
    recurringType: expData.recurringType || null,
    notes: expData.notes || null,
    createdAt: new Date().toISOString(),
  };
  data.expenses.unshift(expense);
  saveData(data);
  return expense;
}

export function deleteExpense(id: string): void {
  const data = loadData();
  data.expenses = data.expenses.filter(e => e.id !== id);
  saveData(data);
}

// ============================================
// CRUD — CLIENTS
// ============================================
export function createClient(clientData: any): Client {
  const data = loadData();
  const client: Client = {
    id: generateId(),
    name: clientData.name,
    phone: clientData.phone || '',
    email: clientData.email || '',
    notes: clientData.notes || '',
    loyaltyPoints: 0,
    totalVisits: 0,
    totalSpent: 0,
    lastVisitAt: null,
    createdAt: new Date().toISOString(),
  };
  data.clients.unshift(client);
  saveData(data);
  return client;
}

// ============================================
// CRUD — SERVICES
// ============================================
export function createService(svcData: any): Service {
  const data = loadData();
  const service: Service = {
    id: generateId(),
    name: svcData.name,
    category: svcData.category || 'Haircut',
    price: parseFloat(svcData.price),
    duration: parseInt(svcData.duration) || 30,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  data.services.push(service);
  saveData(data);
  return service;
}

// ============================================
// CRUD — PRODUCTS
// ============================================
export function createProduct(prodData: any): Product {
  const data = loadData();
  const product: Product = {
    id: generateId(),
    name: prodData.name,
    category: prodData.category || 'Styling',
    price: parseFloat(prodData.price),
    costPrice: parseFloat(prodData.costPrice) || 0,
    quantity: parseInt(prodData.quantity) || 0,
    reorderLevel: parseInt(prodData.reorderLevel) || 5,
    unit: prodData.unit || 'pcs',
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  data.products.push(product);
  saveData(data);
  return product;
}

export function updateProduct(id: string, updates: any): void {
  const data = loadData();
  const product = data.products.find(p => p.id === id);
  if (product) {
    Object.assign(product, updates);
    saveData(data);
  }
}

// ============================================
// CRUD — BARBERS
// ============================================
export function createBarber(brbData: any): Barber {
  const data = loadData();
  const barber: Barber = {
    id: generateId(),
    name: brbData.name,
    phone: brbData.phone || '',
    role: brbData.role || 'barber',
    commissionType: brbData.commissionType || 'percentage',
    commissionValue: parseFloat(brbData.commissionValue) || 60,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  data.barbers.push(barber);
  saveData(data);
  return barber;
}

// ============================================
// CRUD — QUEUE
// ============================================
export function addToQueue(entryData: any): QueueEntry {
  const data = loadData();
  const waiting = data.queue.filter(q => q.status === 'waiting');
  const position = waiting.length + 1;
  const entry: QueueEntry = {
    id: generateId(),
    clientName: entryData.clientName,
    clientPhone: entryData.clientPhone || null,
    partySize: parseInt(entryData.partySize) || 1,
    preferredBarberId: entryData.preferredBarberId || null,
    status: 'waiting',
    checkInTime: new Date().toISOString(),
    seatedTime: null,
    waitMinutes: null,
    notes: entryData.notes || null,
    position,
    createdAt: new Date().toISOString(),
  };
  data.queue.push(entry);
  saveData(data);
  return entry;
}

export function updateQueueEntry(id: string, action: 'seat' | 'no_show' | 'cancel'): void {
  const data = loadData();
  const entry = data.queue.find(q => q.id === id);
  if (!entry) return;
  const now = new Date();
  if (action === 'seat') {
    entry.status = 'seated';
    entry.seatedTime = now.toISOString();
    const wait = Math.round((now.getTime() - new Date(entry.checkInTime).getTime()) / 60000);
    entry.waitMinutes = wait;
  } else if (action === 'no_show') {
    entry.status = 'no_show';
  } else if (action === 'cancel') {
    entry.status = 'cancelled';
  }
  // Reindex waiting positions
  const waiting = data.queue.filter(q => q.status === 'waiting').sort((a, b) => a.position - b.position);
  waiting.forEach((q, i) => { q.position = i + 1; });
  saveData(data);
}

// ============================================
// QUERIES — dashboard & reports
// ============================================
export function getDashboardData() {
  const data = loadData();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todaySales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= todayStart);
  const weekSales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= weekStart);
  const monthSales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= monthStart);

  const sum = (arr: any[]) => arr.reduce((s, x) => s + x.totalAmount, 0);
  const sumExp = (arr: any[]) => arr.reduce((s, x) => s + x.amount, 0);

  const todayExpenses = data.expenses.filter(e => new Date(e.expenseDate) >= todayStart);
  const weekExpenses = data.expenses.filter(e => new Date(e.expenseDate) >= weekStart);
  const monthExpenses = data.expenses.filter(e => new Date(e.expenseDate) >= monthStart);

  // 7-day trend
  const dailyTrend: any[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const daySales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= dayStart && new Date(s.saleDate) < dayEnd);
    const dayExp = data.expenses.filter(e => new Date(e.expenseDate) >= dayStart && new Date(e.expenseDate) < dayEnd);
    dailyTrend.push({
      date: dayStart.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' }),
      sales: daySales.reduce((s, x) => s + x.totalAmount, 0),
      expenses: dayExp.reduce((s, x) => s + x.amount, 0),
      profit: daySales.reduce((s, x) => s + x.totalAmount, 0) - dayExp.reduce((s, x) => s + x.amount, 0),
      count: daySales.length,
    });
  }

  // Top services this month
  const svcMap = new Map<string, { name: string; count: number; revenue: number }>();
  monthSales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'service') {
        const ex = svcMap.get(item.itemName) || { name: item.itemName, count: 0, revenue: 0 };
        ex.count += item.quantity;
        ex.revenue += item.lineTotal;
        svcMap.set(item.itemName, ex);
      }
    });
  });
  const topServices = Array.from(svcMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Barber performance this month
  const brbMap = new Map<string, { name: string; sales: number; revenue: number; commission: number }>();
  monthSales.forEach(sale => {
    if (!sale.barberId) return;
    const barber = data.barbers.find(b => b.id === sale.barberId);
    if (!barber) return;
    const ex = brbMap.get(barber.id) || { name: barber.name, sales: 0, revenue: 0, commission: 0 };
    ex.sales += 1;
    ex.revenue += sale.totalAmount;
    const comm = barber.commissionType === 'percentage' ? (sale.totalAmount * barber.commissionValue / 100) : barber.commissionValue;
    ex.commission += comm;
    brbMap.set(barber.id, ex);
  });
  const barberPerformance = Array.from(brbMap.values()).sort((a, b) => b.revenue - a.revenue);

  // Payment breakdown
  const paymentBreakdown = { cash: 0, mpesa: 0, card: 0 };
  monthSales.forEach(s => { paymentBreakdown[s.paymentMethod as keyof typeof paymentBreakdown] = (paymentBreakdown[s.paymentMethod as keyof typeof paymentBreakdown] || 0) + s.totalAmount; });

  // Low stock
  const lowStockProducts = data.products.filter(p => p.isActive && p.quantity <= p.reorderLevel);

  // Expense breakdown this month
  const expCategories = ['rent', 'utilities', 'supplies', 'salaries', 'inventory', 'maintenance', 'marketing', 'misc'];
  const expenseBreakdown = expCategories.map(cat => ({ category: cat, amount: monthExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0) })).filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount);

  return {
    sales: {
      today: { amount: sum(todaySales), count: todaySales.length, avg: todaySales.length > 0 ? sum(todaySales) / todaySales.length : 0 },
      week: { amount: sum(weekSales), count: weekSales.length },
      month: { amount: sum(monthSales), count: monthSales.length },
    },
    expenses: { today: sumExp(todayExpenses), week: sumExp(weekExpenses), month: sumExp(monthExpenses), breakdown: expenseBreakdown },
    profit: {
      today: sum(todaySales) - sumExp(todayExpenses),
      week: sum(weekSales) - sumExp(weekExpenses),
      month: sum(monthSales) - sumExp(monthExpenses),
    },
    dailyTrend,
    topServices,
    barberPerformance,
    paymentBreakdown,
    lowStockProducts,
    recentSales: data.sales.slice(0, 10),
    stats: { totalClients: data.clients.length, totalServices: data.services.length, totalProducts: data.products.length, totalBarbers: data.barbers.length },
  };
}

export function getPnLData(period: 'daily' | 'weekly' | 'monthly' | 'yearly', from?: string, to?: string) {
  const data = loadData();
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  let prevStart = new Date(now);
  let prevEnd = new Date(now);

  if (from && to) {
    startDate = new Date(from);
    endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);
    const len = endDate.getTime() - startDate.getTime();
    prevEnd = new Date(startDate.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - len);
  } else {
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        prevStart = new Date(startDate); prevStart.setDate(prevStart.getDate() - 1);
        prevEnd = new Date(startDate.getTime() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        prevEnd = new Date(startDate.getTime() - 1);
        prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 6);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(startDate.getTime() - 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        prevStart = new Date(now.getFullYear() - 1, 0, 1);
        prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;
    }
    endDate.setHours(23, 59, 59, 999);
  }

  const sales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= startDate && new Date(s.saleDate) <= endDate);
  const expenses = data.expenses.filter(e => new Date(e.expenseDate) >= startDate && new Date(e.expenseDate) <= endDate);
  const prevSales = data.sales.filter(s => s.status === 'completed' && new Date(s.saleDate) >= prevStart && new Date(s.saleDate) <= prevEnd);
  const prevExpenses = data.expenses.filter(e => new Date(e.expenseDate) >= prevStart && new Date(e.expenseDate) <= prevEnd);

  const current = computePnL(sales, expenses, data.barbers);
  const previous = computePnL(prevSales, prevExpenses, data.barbers);

  // Daily breakdown
  const dayMap = new Map<string, any>();
  sales.forEach(sale => {
    const dateKey = sale.saleDate.split('T')[0];
    const ex = dayMap.get(dateKey) || { date: dateKey, displayDate: new Date(sale.saleDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }), serviceRevenue: 0, retailRevenue: 0, tips: 0, totalRevenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0, salesCount: 0 };
    ex.salesCount += 1;
    sale.items.forEach(item => {
      if (item.itemType === 'service') ex.serviceRevenue += item.lineTotal;
      else ex.retailRevenue += item.lineTotal;
    });
    ex.tips += sale.tipAmount || 0;
    ex.totalRevenue += sale.totalAmount;
    ex.grossProfit = ex.serviceRevenue + ex.retailRevenue + ex.tips - ex.cogs;
    dayMap.set(dateKey, ex);
  });
  expenses.forEach(exp => {
    const dateKey = exp.expenseDate.split('T')[0];
    const ex = dayMap.get(dateKey) || { date: dateKey, displayDate: new Date(exp.expenseDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' }), serviceRevenue: 0, retailRevenue: 0, tips: 0, totalRevenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0, salesCount: 0 };
    ex.expenses += exp.amount;
    dayMap.set(dateKey, ex);
  });
  dayMap.forEach(d => { d.netProfit = d.grossProfit - d.expenses; });
  const dailyBreakdown = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    period,
    range: { from: startDate.toISOString(), to: endDate.toISOString() },
    previousRange: { from: prevStart.toISOString(), to: prevEnd.toISOString() },
    current,
    previous,
    dailyBreakdown,
    sales,
    expenses,
  };
}

function computePnL(sales: Sale[], expenses: Expense[], barbers: Barber[]) {
  let serviceRevenue = 0, retailRevenue = 0, tips = 0, discounts = 0, cogs = 0;
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (item.itemType === 'service') serviceRevenue += item.lineTotal;
      else retailRevenue += item.lineTotal;
    });
    tips += sale.tipAmount || 0;
    discounts += sale.discountAmount || 0;
  });
  const totalRevenue = serviceRevenue + retailRevenue + tips;
  const grossProfit = totalRevenue - cogs;

  const expByCat: Record<string, number> = { rent: 0, utilities: 0, salaries: 0, supplies: 0, inventory: 0, maintenance: 0, marketing: 0, misc: 0 };
  expenses.forEach(e => { expByCat[e.category] = (expByCat[e.category] || 0) + e.amount; });
  const totalOpEx = expenses.reduce((s, e) => s + e.amount, 0);

  let totalCommissions = 0;
  const brbMap = new Map<string, { name: string; revenue: number; commission: number; sales: number }>();
  sales.forEach(sale => {
    if (!sale.barberId) return;
    const barber = barbers.find(b => b.id === sale.barberId);
    if (!barber) return;
    const comm = barber.commissionType === 'percentage' ? (sale.totalAmount * barber.commissionValue / 100) : barber.commissionValue;
    totalCommissions += comm;
    const ex = brbMap.get(barber.id) || { name: barber.name, revenue: 0, commission: 0, sales: 0 };
    ex.revenue += sale.totalAmount; ex.commission += comm; ex.sales += 1;
    brbMap.set(barber.id, ex);
  });

  const netProfit = grossProfit - totalOpEx - totalCommissions;
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;
  const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return {
    revenue: { services: serviceRevenue, retail: retailRevenue, tips, discounts, total: totalRevenue },
    cogs, grossProfit, grossMargin,
    operatingExpenses: { byCategory: expByCat, total: totalOpEx },
    commissions: { byBarber: Array.from(brbMap.values()).sort((a, b) => b.revenue - a.revenue), total: totalCommissions },
    netProfit, profitMargin,
    salesCount: sales.length,
    avgSaleValue: sales.length > 0 ? totalRevenue / sales.length : 0,
    totalRevenue, totalExpenses: totalOpEx + totalCommissions,
  };
}

export function getQueueData() {
  const data = loadData();
  const queue = data.queue.filter(q => q.status === 'waiting').sort((a, b) => a.position - b.position);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEntries = data.queue.filter(q => new Date(q.checkInTime) >= today);
  const seatedToday = todayEntries.filter(q => q.status === 'seated');
  const noShowToday = todayEntries.filter(q => q.status === 'no_show');
  const avgWait = seatedToday.length > 0 ? Math.round(seatedToday.reduce((s, q) => s + (q.waitMinutes || 0), 0) / seatedToday.length) : 0;
  const noShowRate = todayEntries.length > 0 ? Math.round((noShowToday.length / todayEntries.length) * 100) : 0;
  return { queue, stats: { waiting: queue.length, totalToday: todayEntries.length, seatedToday: seatedToday.length, noShowToday: noShowToday.length, avgWaitMinutes: avgWait, noShowRate } };
}
