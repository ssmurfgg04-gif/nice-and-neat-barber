'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Scissors, Users, CreditCard, Settings, Package,
  Plus, Search, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock,
  Trash2, X, Save, AlertCircle, Menu, Globe, TrendingUp, TrendingDown,
  DollarSign, Calendar, Download, Printer, Wallet, ArrowUp, ArrowDown,
  Zap, Phone, User, ScissorsIcon, Eye, Edit2, ChevronDown, Filter,
  BarChart3, PieChart, Activity, Store, Award, Bell, FileText, Receipt
} from 'lucide-react';
import { formatCurrency } from '@/lib/i18n';

// ============================================
// TYPES
// ============================================
type View = 'dashboard' | 'new-sale' | 'queue' | 'clients' | 'expenses' | 'reports' | 'inventory' | 'barbers' | 'settings';

interface Service { id: string; name: string; category: string; price: number; duration: number; isActive: boolean; }
interface Product { id: string; name: string; category: string; price: number; costPrice: number; quantity: number; reorderLevel: number; unit: string; isActive: boolean; }
interface Client { id: string; name: string; phone?: string; email?: string; notes?: string; loyaltyPoints: number; totalVisits: number; totalSpent: number; lastVisitAt?: string; sales?: any[]; }
interface Barber { id: string; name: string; phone?: string; role: string; commissionType: string; commissionValue: number; isActive: boolean; }
interface Sale { id: string; invoiceNumber: string; clientId?: string; client?: Client; barberId?: string; barber?: Barber; subtotal: number; discountAmount: number; totalAmount: number; paymentMethod: string; mpesaRef?: string; status: string; notes?: string; saleDate: string; items: any[]; }
interface Expense { id: string; category: string; description: string; amount: number; paymentMethod: string; vendor?: string; expenseDate: string; isRecurring: boolean; notes?: string; }
interface DashboardData {
  sales: { today: { amount: number; count: number; avg: number }; week: { amount: number; count: number }; month: { amount: number; count: number }; };
  expenses: { today: number; week: number; month: number; breakdown: { category: string; amount: number }[]; };
  profit: { today: number; week: number; month: number; };
  dailyTrend: { date: string; sales: number; expenses: number; profit: number; count: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  paymentBreakdown: { cash: number; mpesa: number; card: number; };
  barberPerformance: { name: string; sales: number; revenue: number; commission: number }[];
  lowStockProducts: Product[];
  recentSales: Sale[];
  stats: { totalClients: number; totalServices: number; totalProducts: number; totalBarbers: number; };
}

// ============================================
// HELPERS
// ============================================
function MiniBarChart({ data, color = 'bg-primary' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((val, i) => {
        const h = Math.max((val / max) * 100, 3);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div className="text-[9px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity absolute -top-4">{formatCurrency(val)}</div>
            <div className={`w-full ${color} rounded-t-md transition-all duration-500`} style={{ height: `${h}%` }} />
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    completed: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    refunded: { label: 'Refunded', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  };
  const c = cfg[status] || cfg.completed;
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${c.cls}`}>{c.label}</span>;
}

// ============================================
// MAIN APP
// ============================================
export default function NiceAndNeat() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [shopId, setShopId] = useState<string>('');
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Data
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // New Sale state
  const [cart, setCart] = useState<{ itemType: 'service' | 'product'; itemId: string; itemName: string; price: number; quantity: number }[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [mpesaRef, setMpesaRef] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleTab, setSaleTab] = useState<'services' | 'products'>('services');
  const [clientSearch, setClientSearch] = useState('');
  const [showClientSelect, setShowClientSelect] = useState(false);

  // Queue state
  const [queueData, setQueueData] = useState<any>(null);
  const [newQueueEntry, setNewQueueEntry] = useState({ clientName: '', clientPhone: '', partySize: '1', preferredBarberId: '', notes: '' });
  const [showAddQueue, setShowAddQueue] = useState(false);

  // Expenses state
  const [newExpense, setNewExpense] = useState({ category: 'supplies', description: '', amount: '', paymentMethod: 'cash', vendor: '', expenseDate: '' });
  const [expenseFilter, setExpenseFilter] = useState({ category: 'all', from: '', to: '', search: '' });

  // Reports state
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [reportData, setReportData] = useState<any>(null);
  const [pnlData, setPnlData] = useState<any>(null);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportTab, setReportTab] = useState<'pnl' | 'trend' | 'breakdown' | 'transactions'>('pnl');

  // Sales/Expense search
  const [salesSearch, setSalesSearch] = useState('');

  // New item modals
  const [showNewService, setShowNewService] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showNewBarber, setShowNewBarber] = useState(false);
  const [newService, setNewService] = useState({ name: '', category: 'Haircut', price: '', duration: '30' });
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Styling', price: '', costPrice: '', quantity: '', reorderLevel: '5', unit: 'pcs' });
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', notes: '' });
  const [newBarber, setNewBarber] = useState({ name: '', phone: '', role: 'barber', commissionType: 'percentage', commissionValue: '60' });

  // === EFFECTS ===
  useEffect(() => { document.documentElement.classList.toggle('dark', isDark); }, [isDark]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

  // Seed
  const seedDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.shopId) { setShopId(data.shopId); setIsSeeded(true); showToast('Welcome to Nice & Neat! Demo data loaded.', 'success'); }
    } catch { showToast('Failed to initialize database', 'error'); }
  }, []);
  useEffect(() => { if (!isSeeded) seedDatabase(); }, [isSeeded, seedDatabase]);

  // === FETCHERS ===
  const fetchDashboard = useCallback(async () => {
    if (!shopId) return;
    try {
      const r = await fetch(`/api/dashboard?shopId=${shopId}`);
      if (!r.ok) throw new Error('Dashboard fetch failed');
      const d = await r.json();
      setDashboard(d);
      setLoadingError(null);
    } catch (e: any) { setLoadingError(e.message); }
  }, [shopId]);

  const fetchServices = useCallback(async () => {
    if (!shopId) return;
    try { const r = await fetch(`/api/services?shopId=${shopId}`); if (r.ok) setServices(await r.json()); } catch {}
  }, [shopId]);

  const fetchProducts = useCallback(async () => {
    if (!shopId) return;
    try { const r = await fetch(`/api/products?shopId=${shopId}`); if (r.ok) setProducts(await r.json()); } catch {}
  }, [shopId]);

  const fetchClients = useCallback(async (search?: string) => {
    if (!shopId) return;
    try { const r = await fetch(`/api/clients?shopId=${shopId}${search ? `&search=${search}` : ''}`); if (r.ok) setClients(await r.json()); } catch {}
  }, [shopId]);

  const fetchBarbers = useCallback(async () => {
    if (!shopId) return;
    try { const r = await fetch(`/api/barbers?shopId=${shopId}`); if (r.ok) setBarbers(await r.json()); } catch {}
  }, [shopId]);

  const fetchExpenses = useCallback(async () => {
    if (!shopId) return;
    try {
      const params = new URLSearchParams({ shopId, ...expenseFilter });
      const r = await fetch(`/api/expenses?${params}`);
      if (r.ok) setExpenses(await r.json());
    } catch {}
  }, [shopId, expenseFilter]);

  const fetchRecentSales = useCallback(async () => {
    if (!shopId) return;
    try {
      const r = await fetch(`/api/sales?shopId=${shopId}&limit=20${salesSearch ? `&search=${salesSearch}` : ''}`);
      if (r.ok) setRecentSales(await r.json());
    } catch {}
  }, [shopId, salesSearch]);

  const fetchQueue = useCallback(async () => {
    if (!shopId) return;
    try { const r = await fetch(`/api/queue?shopId=${shopId}`); if (r.ok) setQueueData(await r.json()); } catch {}
  }, [shopId]);

  const fetchReports = useCallback(async () => {
    if (!shopId) return;
    try {
      const params = new URLSearchParams({ shopId, period: reportPeriod });
      if (reportFrom) params.set('from', reportFrom);
      if (reportTo) params.set('to', reportTo);
      const [r, pnl] = await Promise.all([
        fetch(`/api/reports?${params}`),
        fetch(`/api/profit-loss?${params}`),
      ]);
      if (r.ok) setReportData(await r.json());
      if (pnl.ok) setPnlData(await pnl.json());
    } catch {}
  }, [shopId, reportPeriod, reportFrom, reportTo]);

  // View-based data fetching
  useEffect(() => {
    if (!shopId) return;
    const fetchers: Record<View, () => void> = {
      dashboard: fetchDashboard,
      'new-sale': async () => { await fetchServices(); await fetchProducts(); await fetchBarbers(); },
      queue: fetchQueue,
      clients: () => fetchClients(),
      expenses: fetchExpenses,
      reports: fetchReports,
      inventory: async () => { await fetchProducts(); await fetchServices(); },
      barbers: fetchBarbers,
      settings: () => {},
    };
    fetchers[currentView]?.();
  }, [currentView, shopId, fetchDashboard, fetchServices, fetchProducts, fetchBarbers, fetchClients, fetchExpenses, fetchReports, fetchQueue]);

  // === CART LOGIC ===
  const addToCart = (item: Service | Product, itemType: 'service' | 'product') => {
    setCart(prev => {
      if (itemType === 'service') {
        const existing = prev.find(c => c.itemId === item.id && c.itemType === 'service');
        if (existing) return prev; // Services don't stack
        return [...prev, { itemType, itemId: item.id, itemName: item.name, price: item.price, quantity: 1 }];
      }
      const existing = prev.find(c => c.itemId === item.id && c.itemType === 'product');
      if (existing) return prev.map(c => c.itemId === item.id && c.itemType === 'product' ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { itemType, itemId: item.id, itemName: item.name, price: item.price, quantity: 1 }];
    });
  };
  const removeFromCart = (idx: number) => setCart(prev => prev.filter((_, i) => i !== idx));
  const updateCartQty = (idx: number, qty: number) => { if (qty <= 0) { removeFromCart(idx); return; } setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: qty } : c)); };
  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartDiscount = parseFloat(discountAmount) || 0;
  const cartTip = parseFloat(tipAmount) || 0;
  const cartTotal = cartSubtotal - cartDiscount + cartTip;

  // === CREATE SALE ===
  const createSale = async () => {
    if (cart.length === 0 || !shopId) return;
    try {
      const res = await fetch('/api/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId, items: cart, clientId: selectedClient?.id, barberId: selectedBarber?.id, paymentMethod, mpesaRef, discountAmount: cartDiscount, tipAmount: cartTip, notes: saleNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCart([]); setSelectedClient(null); setSelectedBarber(null); setPaymentMethod('cash'); setMpesaRef(''); setDiscountAmount(''); setTipAmount(''); setSaleNotes('');
      showToast(`Sale ${data.invoiceNumber} recorded!`, 'success');
      fetchDashboard();
    } catch (err: any) { showToast(err.message, 'error'); }
  };

  // === NAV ITEMS ===
  const navGroups = [
    { label: 'MAIN', items: [{ view: 'dashboard' as View, icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' }, { view: 'new-sale' as View, icon: <Scissors className="w-5 h-5" />, label: 'New Sale' }, { view: 'queue' as View, icon: <Users className="w-5 h-5" />, label: 'Walk-In Queue' }] },
    { label: 'MANAGE', items: [{ view: 'clients' as View, icon: <Users className="w-5 h-5" />, label: 'Clients' }, { view: 'barbers' as View, icon: <User className="w-5 h-5" />, label: 'Barbers' }, { view: 'inventory' as View, icon: <Package className="w-5 h-5" />, label: 'Inventory' }] },
    { label: 'FINANCE', items: [{ view: 'expenses' as View, icon: <CreditCard className="w-5 h-5" />, label: 'Expenses' }, { view: 'reports' as View, icon: <BarChart3 className="w-5 h-5" />, label: 'Reports' }] },
    { label: 'SYSTEM', items: [{ view: 'settings' as View, icon: <Settings className="w-5 h-5" />, label: 'Settings' }] },
  ];

  // ============================================
  // RENDER: SIDEBAR
  // ============================================
  const renderSidebar = () => (
    <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:z-auto`}>
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div><h1 className="text-lg font-bold gradient-text">Nice & Neat</h1><p className="text-[10px] text-muted-foreground tracking-wide uppercase font-semibold">Barber Shop</p></div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="sidebar-section-label">{group.label}</p>
              {group.items.map(item => (
                <button key={item.view} onClick={() => { setCurrentView(item.view); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${currentView === item.view ? 'nav-item-active' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1.5">
          <button onClick={() => setIsDark(d => !d)} className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors">
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <p className="text-[10px] text-center text-muted-foreground">v1.0 • Nice & Neat</p>
        </div>
      </div>
    </aside>
  );

  // ============================================
  // RENDER: DASHBOARD
  // ============================================
  const renderDashboard = () => {
    if (loadingError) return <div className="flex flex-col items-center justify-center h-64 text-center"><AlertTriangle className="w-10 h-10 text-amber-500 mb-2" /><p className="text-sm font-medium">Connection error</p><p className="text-xs text-muted-foreground mt-1">{loadingError}</p><button onClick={fetchDashboard} className="mt-3 px-4 py-2 btn-primary rounded-lg text-sm">Retry</button></div>;
    if (!dashboard) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
      <div className="space-y-5 animate-in">
        {/* Hero: Today's Performance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 dark:from-amber-700 dark:via-orange-800 dark:to-red-800 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10"><Scissors className="w-32 h-32" /></div>
            <p className="text-amber-100 text-xs font-medium tracking-wide uppercase">Today&apos;s Performance</p>
            <p className="text-4xl font-bold mt-2">{formatCurrency(dashboard.sales.today.amount)}</p>
            <p className="text-sm text-amber-100 mt-1">{dashboard.sales.today.count} sales • Avg {formatCurrency(dashboard.sales.today.avg)}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white/15 rounded-lg p-3"><p className="text-xs text-amber-100">This Week</p><p className="text-lg font-bold mt-0.5">{formatCurrency(dashboard.sales.week.amount)}</p><p className="text-[10px] text-amber-200">{dashboard.sales.week.count} sales</p></div>
              <div className="bg-white/15 rounded-lg p-3"><p className="text-xs text-amber-100">This Month</p><p className="text-lg font-bold mt-0.5">{formatCurrency(dashboard.sales.month.amount)}</p><p className="text-[10px] text-amber-200">{dashboard.sales.month.count} sales</p></div>
              <div className="bg-white/15 rounded-lg p-3"><p className="text-xs text-amber-100">Today&apos;s Profit</p><p className="text-lg font-bold mt-0.5">{formatCurrency(dashboard.profit.today)}</p><p className="text-[10px] text-amber-200">After expenses</p></div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button onClick={() => setCurrentView('new-sale')} className="w-full btn-primary flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl"><Scissors className="w-4 h-4" /> New Sale</button>
              <button onClick={() => setCurrentView('expenses')} className="w-full card-interactive flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border border-border"><CreditCard className="w-4 h-4 text-primary" /> Record Expense</button>
              <button onClick={() => setCurrentView('reports')} className="w-full card-interactive flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-xl border border-border"><BarChart3 className="w-4 h-4 text-primary" /> View Reports</button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card-stat rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-emerald-500" /><span className="text-label">Month Sales</span></div><p className="text-xl font-bold">{formatCurrency(dashboard.sales.month.amount)}</p><p className="text-xs text-muted-foreground">{dashboard.sales.month.count} sales</p></div>
          <div className="card-stat rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-label">Month Expenses</span></div><p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dashboard.expenses.month)}</p><p className="text-xs text-muted-foreground">{dashboard.expenses.breakdown.length} categories</p></div>
          <div className="card-stat rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-label">Month Profit</span></div><p className="text-xl font-bold text-primary">{formatCurrency(dashboard.profit.month)}</p><p className="text-xs text-muted-foreground">Net income</p></div>
          <div className="card-stat rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-blue-500" /><span className="text-label">Clients</span></div><p className="text-xl font-bold">{dashboard.stats.totalClients}</p><p className="text-xs text-muted-foreground">{dashboard.stats.totalBarbers} barbers</p></div>
        </div>

        {/* 7-Day Trend */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> 7-Day Sales vs Expenses</h3>
          <div className="flex items-end gap-2 h-32">
            {dashboard.dailyTrend.map((day, i) => {
              const maxVal = Math.max(...dashboard.dailyTrend.map(d => Math.max(d.sales, d.expenses)), 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex items-end gap-0.5 h-24 relative">
                    <div className="flex-1 bg-primary rounded-t-sm transition-all duration-500 group-hover:opacity-80" style={{ height: `${Math.max((day.sales / maxVal) * 100, 2)}%` }} title={`Sales: ${formatCurrency(day.sales)}`} />
                    <div className="flex-1 bg-red-400 dark:bg-red-600 rounded-t-sm transition-all duration-500 group-hover:opacity-80" style={{ height: `${Math.max((day.expenses / maxVal) * 100, 2)}%` }} title={`Expenses: ${formatCurrency(day.expenses)}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{day.date}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded-sm" /> Sales</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 dark:bg-red-600 rounded-sm" /> Expenses</span>
          </div>
        </div>

        {/* Top Services + Barber Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Top Services This Month</h3>
            {dashboard.topServices.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : (
              <div className="space-y-2">
                {dashboard.topServices.map((svc, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                      <span className="text-sm font-medium">{svc.name}</span>
                    </div>
                    <div className="text-right"><span className="text-sm font-bold">{formatCurrency(svc.revenue)}</span><span className="text-xs text-muted-foreground ml-2">{svc.count}x</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Barber Performance</h3>
            {dashboard.barberPerformance.length === 0 ? <p className="text-sm text-muted-foreground">No data yet</p> : (
              <div className="space-y-2">
                {dashboard.barberPerformance.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{b.name}</span>
                    <div className="text-right"><span className="text-sm font-bold">{formatCurrency(b.revenue)}</span><span className="text-xs text-muted-foreground ml-2 block">Commission: {formatCurrency(b.commission)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Sales + Low Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Recent Sales</h3>
              <button onClick={() => setCurrentView('reports')} className="text-xs text-primary hover:underline">View all</button>
            </div>
            {dashboard.recentSales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet</p> : (
              <div className="space-y-2">
                {dashboard.recentSales.slice(0, 5).map(sale => (
                  <div key={sale.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition">
                    <div><p className="text-sm font-medium">{sale.invoiceNumber}</p><p className="text-xs text-muted-foreground">{sale.client?.name || 'Walk-in'} • {new Date(sale.saleDate).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p></div>
                    <div className="text-right"><p className="text-sm font-bold">{formatCurrency(sale.totalAmount)}</p><p className="text-xs text-muted-foreground capitalize">{sale.paymentMethod}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Alerts</h3>
            {dashboard.lowStockProducts.length === 0 ? <div className="text-center py-4"><CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">All products well stocked</p></div> : (
              <div className="space-y-2">
                {dashboard.lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{p.quantity} {p.unit} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: NEW SALE
  // ============================================
  const renderNewSale = () => {
    const filteredClients = clientSearch ? clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone?.includes(clientSearch)) : clients.slice(0, 5);

    return (
      <div className="pos-grid">
        {/* LEFT: Service/Product Selection */}
        <div className="space-y-3 overflow-y-auto">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setSaleTab('services')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md font-medium transition ${saleTab === 'services' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}><Scissors className="w-4 h-4" /> Services</button>
            <button onClick={() => setSaleTab('products')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-md font-medium transition ${saleTab === 'products' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}><Package className="w-4 h-4" /> Products</button>
          </div>

          {saleTab === 'services' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services.map(svc => (
                <button key={svc.id} onClick={() => addToCart(svc, 'service')}
                  className="card-interactive rounded-xl p-4 text-left group">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Scissors className="w-4 h-4 text-primary" /></div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{svc.category}</span>
                  </div>
                  <p className="font-medium text-sm mt-2">{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{svc.duration} min</p>
                  <p className="text-lg font-bold text-primary mt-1">{formatCurrency(svc.price)}</p>
                </button>
              ))}
              <button onClick={() => setShowNewService(true)} className="rounded-xl p-4 text-center border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition flex flex-col items-center justify-center gap-2">
                <Plus className="w-6 h-6" /><span className="text-sm">Add Service</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => (
                <button key={p.id} onClick={() => addToCart(p, 'product')} disabled={p.quantity <= 0}
                  className="card-interactive rounded-xl p-4 text-left disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center"><Package className="w-4 h-4 text-blue-500" /></div>
                    {p.quantity <= p.reorderLevel && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  </div>
                  <p className="font-medium text-sm mt-2">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.quantity} {p.unit} in stock</p>
                  <p className="text-lg font-bold text-primary mt-1">{formatCurrency(p.price)}</p>
                </button>
              ))}
              <button onClick={() => setShowNewProduct(true)} className="rounded-xl p-4 text-center border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition flex flex-col items-center justify-center gap-2">
                <Plus className="w-6 h-6" /><span className="text-sm">Add Product</span>
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Cart & Checkout */}
        <div className="bg-card border border-border rounded-xl flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h2 className="font-bold flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" /> Current Sale {cart.length > 0 && <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">{cart.length}</span>}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? <p className="text-center text-muted-foreground py-8 text-sm">Select services or products to start a sale</p> : cart.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-muted rounded-lg p-2.5">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.itemName}</p><p className="text-xs text-muted-foreground">{item.itemType === 'service' ? 'Service' : 'Product'} • {formatCurrency(item.price)}</p></div>
                {item.itemType === 'product' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateCartQty(idx, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-card border border-border text-xs">-</button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateCartQty(idx, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-card border border-border text-xs">+</button>
                  </div>
                )}
                <p className="font-semibold text-sm w-20 text-right">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeFromCart(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4 space-y-3">
            {/* Client & Barber Selection */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Client (optional)</label>
                {selectedClient ? (
                  <div className="flex items-center justify-between p-2 bg-muted rounded-lg mt-1">
                    <span className="text-sm font-medium truncate">{selectedClient.name}</span>
                    <button onClick={() => setSelectedClient(null)} className="text-xs text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <div className="relative mt-1">
                    <input type="text" placeholder="Search client..." value={clientSearch} onChange={e => { setClientSearch(e.target.value); setShowClientSelect(true); fetchClients(e.target.value); }} onFocus={() => setShowClientSelect(true)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" />
                    {showClientSelect && clientSearch && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredClients.map(c => (
                          <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowClientSelect(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.phone} • {c.totalVisits} visits</p>
                          </button>
                        ))}
                        <button onClick={() => { setShowNewClient(true); setShowClientSelect(false); }} className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-muted transition border-t border-border">+ Add new client</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Barber</label>
                <select value={selectedBarber?.id || ''} onChange={e => setSelectedBarber(barbers.find(b => b.id === e.target.value) || null)} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary mt-1">
                  <option value="">Select barber...</option>
                  {barbers.map(b => <option key={b.id} value={b.id}>{b.name} ({b.role})</option>)}
                </select>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Discount</span><input type="number" value={discountAmount} onChange={e => setDiscountAmount(e.target.value)} placeholder="0" className="w-20 px-2 py-1 text-right text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Tip</span><input type="number" value={tipAmount} onChange={e => setTipAmount(e.target.value)} placeholder="0" className="w-20 px-2 py-1 text-right text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div className="flex justify-between font-bold text-lg pt-1 border-t border-border"><span>Total</span><span className="text-primary">{formatCurrency(cartTotal)}</span></div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs text-muted-foreground">Payment Method</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['cash', 'mpesa', 'card'].map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`px-3 py-2 text-xs rounded-lg border transition capitalize ${paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary'}`}>{method}</button>
                ))}
              </div>
            </div>
            {paymentMethod === 'mpesa' && <input type="text" value={mpesaRef} onChange={e => setMpesaRef(e.target.value.toUpperCase())} placeholder="M-Pesa Ref (e.g. QFG3XK2P9Y)" className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono" />}

            <button onClick={createSale} disabled={cart.length === 0} className="w-full py-3 btn-primary rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Complete Sale
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: WALK-IN QUEUE
  // ============================================
  const renderQueue = () => {
    if (!queueData) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
    const { queue = [], stats = {} } = queueData;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">Walk-In Queue</h2>
            <p className="text-xs text-muted-foreground">Manage walk-in customers — track wait times & no-shows</p>
          </div>
          <button onClick={() => setShowAddQueue(true)} className="flex items-center gap-2 px-3 py-1.5 btn-primary rounded-lg text-xs"><Plus className="w-3.5 h-3.5" /> Add to Queue</button>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card-stat rounded-xl p-3"><p className="text-label">Waiting Now</p><p className="text-2xl font-bold text-primary">{stats.waiting || 0}</p></div>
          <div className="card-stat rounded-xl p-3"><p className="text-label">Seated Today</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.seatedToday || 0}</p></div>
          <div className="card-stat rounded-xl p-3"><p className="text-label">No-Shows Today</p><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.noShowToday || 0}</p></div>
          <div className="card-stat rounded-xl p-3"><p className="text-label">Avg Wait</p><p className="text-2xl font-bold">{stats.avgWaitMinutes || 0}<span className="text-sm text-muted-foreground"> min</span></p></div>
          <div className="card-stat rounded-xl p-3"><p className="text-label">No-Show Rate</p><p className={`text-2xl font-bold ${(stats.noShowRate || 0) > 20 ? 'text-red-600 dark:text-red-400' : (stats.noShowRate || 0) > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{stats.noShowRate || 0}%</p></div>
        </div>

        {(stats.noShowRate || 0) > 20 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-800 dark:text-red-300">High no-show rate ({stats.noShowRate}%). Consider implementing appointment reminders or a no-show policy.</p>
          </div>
        )}

        {/* Queue List */}
        {queue.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Queue is empty</p>
            <p className="text-xs mt-1">Add walk-in customers to start tracking</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((entry: any, i: number) => {
              const waitMin = Math.round((Date.now() - new Date(entry.checkInTime).getTime()) / 60000);
              const barber = barbers.find(b => b.id === entry.preferredBarberId);
              return (
                <div key={entry.id} className={`card-interactive rounded-xl p-4 ${i === 0 ? 'border-primary border-2' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse' : 'bg-gradient-to-br from-amber-500 to-orange-600'}`}>
                        {entry.position}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{entry.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Waiting {waitMin} min
                          {entry.partySize > 1 && ` • Party of ${entry.partySize}`}
                          {barber && ` • Wants ${barber.name}`}
                          {entry.notes && ` • ${entry.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={async () => { await fetch('/api/queue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, action: 'seat' }) }); fetchQueue(); showToast(`${entry.clientName} seated (waited ${waitMin} min)`, 'success'); }} className="px-3 py-1.5 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition">Seat</button>
                      <button onClick={async () => { await fetch('/api/queue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, action: 'no_show' }) }); fetchQueue(); showToast(`${entry.clientName} marked as no-show`, 'warning'); }} className="px-3 py-1.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition">No-Show</button>
                      <button onClick={async () => { await fetch('/api/queue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, action: 'cancel' }) }); fetchQueue(); }} className="px-2 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg hover:bg-muted/70 transition"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add to Queue Modal */}
        {showAddQueue && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddQueue(false)}>
            <div className="bg-card rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Add to Queue</h3><button onClick={() => setShowAddQueue(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
              <div className="space-y-3">
                <div><label className="text-xs text-muted-foreground">Customer Name</label><input type="text" value={newQueueEntry.clientName} onChange={e => setNewQueueEntry(q => ({ ...q, clientName: e.target.value }))} placeholder="e.g. John or Walk-in #3" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-muted-foreground">Phone (optional)</label><input type="tel" value={newQueueEntry.clientPhone} onChange={e => setNewQueueEntry(q => ({ ...q, clientPhone: e.target.value }))} placeholder="254712345678" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                  <div><label className="text-xs text-muted-foreground">Party Size</label><input type="number" value={newQueueEntry.partySize} onChange={e => setNewQueueEntry(q => ({ ...q, partySize: e.target.value }))} min="1" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Preferred Barber (optional)</label><select value={newQueueEntry.preferredBarberId} onChange={e => setNewQueueEntry(q => ({ ...q, preferredBarberId: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option value="">Any available</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
                <div><label className="text-xs text-muted-foreground">Notes (preferences)</label><input type="text" value={newQueueEntry.notes} onChange={e => setNewQueueEntry(q => ({ ...q, notes: e.target.value }))} placeholder="e.g. Wants skin fade" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <button onClick={async () => { if (!newQueueEntry.clientName) { showToast('Name required', 'error'); return; } try { const r = await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newQueueEntry, partySize: parseInt(newQueueEntry.partySize) }) }); if (!r.ok) throw new Error((await r.json()).error); setShowAddQueue(false); setNewQueueEntry({ clientName: '', clientPhone: '', partySize: '1', preferredBarberId: '', notes: '' }); fetchQueue(); showToast('Added to queue!', 'success'); } catch (e: any) { showToast(e.message, 'error'); } }} className="w-full py-2.5 btn-primary rounded-lg text-sm">Add to Queue</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: CLIENTS
  // ============================================
  const renderClients = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Clients</h2>
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><input type="text" placeholder="Search clients..." onChange={e => fetchClients(e.target.value)} className="pl-8 pr-3 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary w-44" /></div>
          <button onClick={() => setShowNewClient(true)} className="flex items-center gap-2 px-3 py-1.5 btn-primary rounded-lg text-xs"><Plus className="w-3.5 h-3.5" /> Add Client</button>
        </div>
      </div>

      {clients.length === 0 ? <div className="text-center py-12 text-muted-foreground"><Users className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No clients yet</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map(client => (
            <div key={client.id} className="card-interactive rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center font-bold text-white text-sm">{client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div>
                    <p className="font-semibold text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.phone || 'No phone'}</p>
                  </div>
                </div>
                <div className="text-right">
                  {client.loyaltyPoints > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold">{client.loyaltyPoints} pts</span>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Visits</p><p className="text-sm font-bold">{client.totalVisits}</p></div>
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Spent</p><p className="text-sm font-bold">{formatCurrency(client.totalSpent)}</p></div>
                <div className="bg-muted/50 rounded-lg p-2"><p className="text-xs text-muted-foreground">Last Visit</p><p className="text-sm font-bold">{client.lastVisitAt ? new Date(client.lastVisitAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}</p></div>
              </div>
              {client.notes && <p className="text-xs text-muted-foreground mt-2 italic">&ldquo;{client.notes}&rdquo;</p>}
              {client.sales && client.sales.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs font-medium mb-1">Recent visits:</p>
                  <div className="space-y-1">
                    {client.sales.slice(0, 3).map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{new Date(s.saleDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} — {s.items.map((i: any) => i.itemName).join(', ')}</span>
                        <span className="font-medium">{formatCurrency(s.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: EXPENSES
  // ============================================
  const renderExpenses = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Expenses</h2>
        <p className="text-xs text-muted-foreground">Track all business expenses — rent, utilities, supplies, salaries & more</p>
      </div>

      {/* Quick Add Expense */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Record New Expense</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div><label className="text-xs text-muted-foreground">Category</label><select value={newExpense.category} onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="rent">Rent</option><option value="utilities">Utilities</option><option value="supplies">Supplies</option><option value="salaries">Salaries</option><option value="inventory">Inventory</option><option value="maintenance">Maintenance</option><option value="marketing">Marketing</option><option value="misc">Miscellaneous</option>
          </select></div>
          <div><label className="text-xs text-muted-foreground">Description</label><input type="text" value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} placeholder="e.g. Monthly rent" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Amount (KES)</label><input type="number" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Payment Method</label><select value={newExpense.paymentMethod} onChange={e => setNewExpense(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option value="cash">Cash</option><option value="mpesa">M-Pesa</option><option value="bank">Bank</option></select></div>
          <div><label className="text-xs text-muted-foreground">Vendor (optional)</label><input type="text" value={newExpense.vendor} onChange={e => setNewExpense(p => ({ ...p, vendor: e.target.value }))} placeholder="e.g. Kenya Power" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Date</label><input type="date" value={newExpense.expenseDate} onChange={e => setNewExpense(p => ({ ...p, expenseDate: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
        </div>
        <button onClick={async () => {
          if (!newExpense.description || !newExpense.amount) { showToast('Description and amount required', 'error'); return; }
          try { const r = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newExpense, amount: parseFloat(newExpense.amount), expenseDate: newExpense.expenseDate || new Date().toISOString().split('T')[0] }) }); if (!r.ok) throw new Error((await r.json()).error); setNewExpense({ category: 'supplies', description: '', amount: '', paymentMethod: 'cash', vendor: '', expenseDate: '' }); fetchExpenses(); showToast('Expense recorded!', 'success'); } catch (e: any) { showToast(e.message, 'error'); }
        }} className="mt-3 px-4 py-2 btn-primary rounded-lg text-sm font-medium">Save Expense</button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={expenseFilter.category} onChange={e => setExpenseFilter(p => ({ ...p, category: e.target.value }))} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary">
          <option value="all">All Categories</option><option value="rent">Rent</option><option value="utilities">Utilities</option><option value="supplies">Supplies</option><option value="salaries">Salaries</option><option value="inventory">Inventory</option><option value="maintenance">Maintenance</option><option value="marketing">Marketing</option><option value="misc">Misc</option>
        </select>
        <input type="date" value={expenseFilter.from} onChange={e => setExpenseFilter(p => ({ ...p, from: e.target.value }))} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
        <span className="text-xs text-muted-foreground">to</span>
        <input type="date" value={expenseFilter.to} onChange={e => setExpenseFilter(p => ({ ...p, to: e.target.value }))} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
        <input type="text" placeholder="Search..." value={expenseFilter.search} onChange={e => setExpenseFilter(p => ({ ...p, search: e.target.value }))} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-32" />
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? <div className="text-center py-12 text-muted-foreground"><CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No expenses found</p></div> : (
        <div className="space-y-2">
          {expenses.map(exp => (
            <div key={exp.id} className="card-interactive rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${exp.category === 'rent' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : exp.category === 'utilities' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : exp.category === 'salaries' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : exp.category === 'supplies' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400' : 'bg-muted text-muted-foreground'}`}>
                  {exp.category === 'rent' ? <Store className="w-4 h-4" /> : exp.category === 'utilities' ? <Zap className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{exp.description}</p>
                  <p className="text-xs text-muted-foreground capitalize">{exp.category} • {exp.vendor || 'No vendor'} • {new Date(exp.expenseDate).toLocaleDateString('en-KE')} • {exp.paymentMethod}{exp.isRecurring && <span className="ml-1 text-blue-600 dark:text-blue-400">↻ {exp.recurringType}</span>}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-red-600 dark:text-red-400">{formatCurrency(exp.amount)}</p>
                <button onClick={async () => { if (confirm('Delete this expense?')) { await fetch(`/api/expenses?id=${exp.id}`, { method: 'DELETE' }); fetchExpenses(); showToast('Expense deleted', 'warning'); } }} className="text-xs text-muted-foreground hover:text-destructive mt-1">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: REPORTS
  // ============================================
  const renderReports = () => {
    const fmtPct = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
    const changePct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / Math.abs(prev)) * 100;
    const pnl = pnlData?.current;
    const prev = pnlData?.previous;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">Profit & Loss Statement</h2>
            <p className="text-xs text-muted-foreground">Daily, weekly, monthly & yearly financial reports</p>
          </div>
          <button onClick={async () => {
            if (!pnl) return;
            // Export full P&L as CSV
            const csv: string[][] = [['Nice & Neat — Profit & Loss Statement']];
            csv.push(['Period', `${pnlData.range.from.split('T')[0]} to ${pnlData.range.to.split('T')[0]}`]);
            csv.push([]);
            csv.push(['REVENUE']);
            csv.push(['Service Revenue', String(pnl.revenue.services)]);
            csv.push(['Retail Product Revenue', String(pnl.revenue.retail)]);
            csv.push(['Tips', String(pnl.revenue.tips)]);
            csv.push(['Total Revenue', String(pnl.revenue.total)]);
            csv.push([]);
            csv.push(['Cost of Goods Sold', String(pnl.cogs)]);
            csv.push(['Gross Profit', String(pnl.grossProfit)]);
            csv.push([]);
            csv.push(['OPERATING EXPENSES']);
            Object.entries(pnl.operatingExpenses.byCategory).forEach(([cat, amt]: [string, any]) => { if (amt > 0) csv.push([cat, String(amt)]); });
            csv.push(['Total Operating Expenses', String(pnl.operatingExpenses.total)]);
            csv.push([]);
            csv.push(['Barber Commissions', String(pnl.commissions.total)]);
            csv.push([]);
            csv.push(['NET PROFIT', String(pnl.netProfit)]);
            csv.push(['Profit Margin %', String(pnl.profitMargin) + '%']);
            // Also export transactions
            csv.push([]);
            csv.push(['TRANSACTIONS']);
            csv.push(['Date', 'Type', 'Description', 'Amount']);
            pnlData.sales.forEach((s: any) => csv.push([new Date(s.saleDate).toLocaleDateString(), 'Sale', s.invoiceNumber, String(s.totalAmount)]));
            pnlData.expenses.forEach((e: any) => csv.push([new Date(e.expenseDate).toLocaleDateString(), 'Expense', e.description, String(e.amount)]));
            const blob = new Blob([csv.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `nice-neat-pnl-${pnlData.range.from.split('T')[0]}-to-${pnlData.range.to.split('T')[0]}.csv`; a.click();
            showToast('P&L statement exported!', 'success');
          }} className="flex items-center gap-2 px-3 py-1.5 card-interactive rounded-lg text-xs border border-border"><Download className="w-3.5 h-3.5" /> Export P&L (CSV)</button>
        </div>

        {/* Period & Date Filters */}
        <div className="bg-card rounded-xl border border-border p-3 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(p => (
              <button key={p} onClick={() => { setReportPeriod(p); setReportFrom(''); setReportTo(''); setTimeout(fetchReports, 50); }} className={`px-4 py-1.5 text-xs rounded-md font-medium capitalize transition ${reportPeriod === p && !reportFrom ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>{p}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} className="px-2 py-1.5 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <button onClick={fetchReports} className="px-3 py-1.5 text-xs btn-primary rounded-lg">Generate Report</button>
          {pnlData?.range && <span className="text-xs text-muted-foreground ml-auto">{pnlData.range.from.split('T')[0]} → {pnlData.range.to.split('T')[0]} {prev && <span className="text-muted-foreground/70">(vs {pnlData.previousRange.from.split('T')[0]} → {pnlData.previousRange.to.split('T')[0]})</span>}</span>}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 border-b border-border">
          {[
            { key: 'pnl' as const, label: 'P&L Statement', icon: <FileText className="w-3.5 h-3.5" /> },
            { key: 'trend' as const, label: 'Trend Chart', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { key: 'breakdown' as const, label: 'Breakdowns', icon: <PieChart className="w-3.5 h-3.5" /> },
            { key: 'transactions' as const, label: 'Transactions', icon: <Receipt className="w-3.5 h-3.5" /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setReportTab(tab.key)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${reportTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {!pnl ? (
          <div className="text-center py-12 text-muted-foreground"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Loading P&L data...</p></div>
        ) : (
          <>
            {/* === KEY METRIC CARDS === */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card-stat rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-label">Total Revenue</p>
                  {prev && (() => { const chg = changePct(pnl.totalRevenue, prev.totalRevenue); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chg >= 0 ? 'metric-up' : 'metric-down'} flex items-center gap-0.5`}>{chg >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}{Math.abs(chg).toFixed(0)}%</span>; })()}
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">{pnl.salesCount} sales • Avg {formatCurrency(pnl.avgSaleValue)}</p>
              </div>
              <div className="card-stat rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-label">Total Expenses</p>
                  {prev && (() => { const chg = changePct(pnl.totalExpenses, prev.totalExpenses); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chg <= 0 ? 'metric-up' : 'metric-down'} flex items-center gap-0.5`}>{chg <= 0 ? <ArrowDown className="w-2.5 h-2.5" /> : <ArrowUp className="w-2.5 h-2.5" />}{Math.abs(chg).toFixed(0)}%</span>; })()}
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(pnl.totalExpenses)}</p>
                <p className="text-xs text-muted-foreground">OpEx {formatCurrency(pnl.operatingExpenses.total)} + Comm {formatCurrency(pnl.commissions.total)}</p>
              </div>
              <div className="card-stat rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-label">Net Profit</p>
                  {prev && (() => { const chg = changePct(pnl.netProfit, prev.netProfit); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chg >= 0 ? 'metric-up' : 'metric-down'} flex items-center gap-0.5`}>{chg >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}{Math.abs(chg).toFixed(0)}%</span>; })()}
                </div>
                <p className={`text-2xl font-bold ${pnl.netProfit >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(pnl.netProfit)}</p>
                <p className="text-xs text-muted-foreground">{pnl.profitMargin}% margin</p>
              </div>
              <div className="card-stat rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <p className="text-label">Gross Profit</p>
                  {prev && (() => { const chg = changePct(pnl.grossProfit, prev.grossProfit); return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${chg >= 0 ? 'metric-up' : 'metric-down'} flex items-center gap-0.5`}>{chg >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}{Math.abs(chg).toFixed(0)}%</span>; })()}
                </div>
                <p className="text-2xl font-bold">{formatCurrency(pnl.grossProfit)}</p>
                <p className="text-xs text-muted-foreground">{pnl.grossMargin}% gross margin</p>
              </div>
            </div>

            {/* === P&L STATEMENT TAB === */}
            {reportTab === 'pnl' && (
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
                  <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Profit & Loss Statement</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">For the period {pnlData.range.from.split('T')[0]} to {pnlData.range.to.split('T')[0]}</p>
                </div>
                <div className="divide-y divide-border">
                  {/* REVENUE SECTION */}
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">Revenue</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Service Revenue (haircuts, shaves, etc.)</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.revenue.services)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Retail Product Sales (pomade, beard oil, etc.)</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.revenue.retail)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Tips</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.revenue.tips)}</span>
                      </div>
                      {pnl.revenue.discounts > 0 && (
                        <div className="flex justify-between items-center py-1.5">
                          <span className="text-sm text-muted-foreground">Less: Discounts Given</span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">({formatCurrency(pnl.revenue.discounts)})</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center py-2 border-t border-border mt-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg px-2">
                        <span className="text-sm font-bold">Total Revenue</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(pnl.revenue.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COGS SECTION */}
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">Cost of Goods Sold</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-sm text-muted-foreground">Cost of Retail Products Sold</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(pnl.cogs)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-t border-border mt-2 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg px-2">
                        <span className="text-sm font-bold">Gross Profit</span>
                        <span className="text-sm font-bold">{formatCurrency(pnl.grossProfit)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs text-muted-foreground">Gross Margin</span>
                        <span className="text-xs font-semibold">{pnl.grossMargin}%</span>
                      </div>
                    </div>
                  </div>

                  {/* OPERATING EXPENSES SECTION */}
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">Operating Expenses</p>
                    <div className="space-y-2">
                      {Object.entries(pnl.operatingExpenses.byCategory)
                        .filter(([_, amt]: [string, any]) => amt > 0)
                        .sort((a: any, b: any) => b[1] - a[1])
                        .map(([cat, amt]: [string, any]) => (
                          <div key={cat} className="flex justify-between items-center py-1.5">
                            <span className="text-sm text-muted-foreground capitalize">{cat === 'misc' ? 'Miscellaneous' : cat}</span>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">({formatCurrency(amt)})</span>
                          </div>
                        ))}
                      <div className="flex justify-between items-center py-2 border-t border-border mt-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg px-2">
                        <span className="text-sm font-bold">Total Operating Expenses</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">({formatCurrency(pnl.operatingExpenses.total)})</span>
                      </div>
                    </div>
                  </div>

                  {/* BARBER COMMISSIONS SECTION */}
                  {pnl.commissions.total > 0 && (
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">Barber Commissions (Labor Cost)</p>
                      <div className="space-y-2">
                        {pnl.commissions.byBarber.map((b: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1.5">
                            <span className="text-sm text-muted-foreground">{b.name} <span className="text-xs">({b.sales} cuts)</span></span>
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">({formatCurrency(b.commission)})</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center py-2 border-t border-border mt-2 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg px-2">
                          <span className="text-sm font-bold">Total Commissions</span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">({formatCurrency(pnl.commissions.total)})</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NET PROFIT SECTION */}
                  <div className={`p-4 ${pnl.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-lg font-bold">NET PROFIT</p>
                        <p className="text-xs text-muted-foreground">Profit Margin: {pnl.profitMargin}%</p>
                      </div>
                      <p className={`text-3xl font-bold ${pnl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(pnl.netProfit)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === TREND CHART TAB === */}
            {reportTab === 'trend' && pnlData.dailyBreakdown && pnlData.dailyBreakdown.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Revenue vs Expenses vs Profit Trend</h3>
                <div className="flex items-end gap-2 h-48">
                  {pnlData.dailyBreakdown.map((day: any, i: number) => {
                    const maxVal = Math.max(...pnlData.dailyBreakdown.map((d: any) => Math.max(d.totalRevenue, d.expenses, Math.abs(d.netProfit))), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full flex items-end gap-0.5 h-40 relative">
                          <div className="flex-1 bg-emerald-500 rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.totalRevenue / maxVal) * 100, 2)}%` }} title={`Revenue: ${formatCurrency(day.totalRevenue)}`} />
                          <div className="flex-1 bg-red-400 dark:bg-red-600 rounded-t-sm transition-all group-hover:opacity-80" style={{ height: `${Math.max((day.expenses / maxVal) * 100, 2)}%` }} title={`Expenses: ${formatCurrency(day.expenses)}`} />
                          <div className={`flex-1 rounded-t-sm transition-all group-hover:opacity-80 ${day.netProfit >= 0 ? 'bg-primary' : 'bg-red-600'}`} style={{ height: `${Math.max((Math.abs(day.netProfit) / maxVal) * 100, 2)}%` }} title={`Profit: ${formatCurrency(day.netProfit)}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate">{day.displayDate}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-sm" /> Revenue</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 dark:bg-red-600 rounded-sm" /> Expenses</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-primary rounded-sm" /> Profit</span>
                </div>
                {/* Daily breakdown table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-right text-muted-foreground">Revenue</th>
                        <th className="px-3 py-2 text-right text-muted-foreground">Expenses</th>
                        <th className="px-3 py-2 text-right text-muted-foreground">Profit</th>
                        <th className="px-3 py-2 text-right text-muted-foreground">Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pnlData.dailyBreakdown.slice().reverse().map((day: any, i: number) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{day.displayDate}</td>
                          <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(day.totalRevenue)}</td>
                          <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{formatCurrency(day.expenses)}</td>
                          <td className={`px-3 py-2 text-right font-bold ${day.netProfit >= 0 ? 'text-primary' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(day.netProfit)}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">{day.salesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* === BREAKDOWNS TAB === */}
            {reportTab === 'breakdown' && reportData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" /> Service Breakdown</h3>
                  <div className="space-y-2">
                    {reportData.serviceBreakdown.map((s: any, i: number) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className="text-sm font-bold">{formatCurrency(s.revenue)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{s.count} times</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(s.revenue / s.count)} avg</span>
                        </div>
                        <div className="w-full bg-background rounded-full h-1.5 mt-2">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${(s.revenue / reportData.serviceBreakdown[0].revenue) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-primary" /> Expense Breakdown</h3>
                  <div className="space-y-2">
                    {reportData.expenseBreakdown.map((e: any, i: number) => {
                      const totalExp = reportData.expenseBreakdown.reduce((s: number, x: any) => s + x.amount, 0);
                      const pct = totalExp > 0 ? (e.amount / totalExp) * 100 : 0;
                      return (
                        <div key={i} className="p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{e.category}</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(e.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-muted-foreground">{pct.toFixed(0)}% of total</span>
                          </div>
                          <div className="w-full bg-background rounded-full h-1.5 mt-2">
                            <div className="bg-red-400 dark:bg-red-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5 md:col-span-2">
                  <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Barber Performance & Commissions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left text-xs text-muted-foreground">Barber</th><th className="px-4 py-2 text-right text-xs text-muted-foreground">Sales</th><th className="px-4 py-2 text-right text-xs text-muted-foreground">Revenue</th><th className="px-4 py-2 text-right text-xs text-muted-foreground">Commission Due</th><th className="px-4 py-2 text-right text-xs text-muted-foreground">Avg Sale</th></tr></thead>
                      <tbody>
                        {reportData.barberBreakdown.map((b: any, i: number) => (
                          <tr key={i} className="border-t border-border hover:bg-muted/30"><td className="px-4 py-2.5 font-medium">{b.name}</td><td className="px-4 py-2.5 text-right">{b.sales}</td><td className="px-4 py-2.5 text-right font-bold">{formatCurrency(b.revenue)}</td><td className="px-4 py-2.5 text-right text-amber-600 dark:text-amber-400 font-medium">{formatCurrency(b.commission)}</td><td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(b.revenue / b.sales)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* === TRANSACTIONS TAB === */}
            {reportTab === 'transactions' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card rounded-2xl border border-border p-4">
                    <h3 className="font-bold text-sm mb-3 text-emerald-600 dark:text-emerald-400">Sales ({pnlData.sales.length})</h3>
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {pnlData.sales.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No sales in this period</p> :
                        pnlData.sales.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition">
                            <div><p className="text-xs font-mono">{s.invoiceNumber}</p><p className="text-xs text-muted-foreground">{new Date(s.saleDate).toLocaleDateString('en-KE')} • {s.barber?.name || '—'}</p></div>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.totalAmount)}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl border border-border p-4">
                    <h3 className="font-bold text-sm mb-3 text-red-600 dark:text-red-400">Expenses ({pnlData.expenses.length})</h3>
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {pnlData.expenses.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No expenses in this period</p> :
                        pnlData.expenses.map((e: any) => (
                          <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition">
                            <div><p className="text-xs font-medium">{e.description}</p><p className="text-xs text-muted-foreground">{new Date(e.expenseDate).toLocaleDateString('en-KE')} • <span className="capitalize">{e.category}</span></p></div>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">({formatCurrency(e.amount)})</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: INVENTORY
  // ============================================
  const renderInventory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold">Inventory</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowNewProduct(true)} className="flex items-center gap-2 px-3 py-1.5 btn-primary rounded-lg text-xs"><Plus className="w-3.5 h-3.5" /> Add Product</button>
          <button onClick={() => setShowNewService(true)} className="flex items-center gap-2 px-3 py-1.5 card-interactive rounded-lg text-xs border border-border"><Plus className="w-3.5 h-3.5" /> Add Service</button>
        </div>
      </div>

      {/* Products */}
      <div>
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Retail Products</h3>
        {products.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No products yet</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map(p => (
              <div key={p.id} className={`card-interactive rounded-xl p-4 ${p.quantity <= p.reorderLevel ? 'border-amber-300 dark:border-amber-800' : ''}`}>
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.category} • {p.unit}</p></div>
                  {p.quantity <= p.reorderLevel && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div><p className="text-xs text-muted-foreground">Price</p><p className="text-sm font-bold">{formatCurrency(p.price)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Cost</p><p className="text-sm font-medium">{formatCurrency(p.costPrice)}</p></div>
                  <div><p className="text-xs text-muted-foreground">In Stock</p><p className={`text-sm font-bold ${p.quantity <= p.reorderLevel ? 'text-amber-600 dark:text-amber-400' : ''}`}>{p.quantity}</p></div>
                  <div><p className="text-xs text-muted-foreground">Reorder At</p><p className="text-sm">{p.reorderLevel}</p></div>
                </div>
                <button onClick={async () => { const newQty = prompt(`Update stock for ${p.name} (current: ${p.quantity}):`, String(p.quantity)); if (newQty !== null) { await fetch('/api/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, quantity: parseInt(newQty) }) }); fetchProducts(); showToast('Stock updated!', 'success'); } }} className="w-full mt-3 py-1.5 text-xs bg-muted rounded-lg hover:bg-primary/10 transition">Adjust Stock</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="mt-6">
        <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><Scissors className="w-4 h-4 text-primary" /> Services Menu</h3>
        {services.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No services yet</p> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {services.map(s => (
              <div key={s.id} className="card-interactive rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div><p className="font-semibold text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.category} • {s.duration} min</p></div>
                </div>
                <p className="text-lg font-bold text-primary mt-2">{formatCurrency(s.price)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER: BARBERS
  // ============================================
  const renderBarbers = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Barbers & Staff</h2>
        <button onClick={() => setShowNewBarber(true)} className="flex items-center gap-2 px-3 py-1.5 btn-primary rounded-lg text-xs"><Plus className="w-3.5 h-3.5" /> Add Barber</button>
      </div>
      <p className="text-sm text-muted-foreground">Track barber performance and commission. Standard split: barber 60% / shop 40%.</p>

      {barbers.length === 0 ? <div className="text-center py-12 text-muted-foreground"><User className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No barbers yet</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {barbers.map(b => (
            <div key={b.id} className="card-interactive rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${b.role === 'owner' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : b.role === 'barber' ? 'bg-gradient-to-br from-blue-500 to-cyan-600' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>{b.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                  <div>
                    <p className="font-semibold text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{b.role}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Commission</span>
                  <span className="font-bold">{b.commissionType === 'percentage' ? `${b.commissionValue}%` : formatCurrency(b.commissionValue)}</span>
                </div>
                {b.phone && <p className="text-xs text-muted-foreground mt-1">{b.phone}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: SETTINGS
  // ============================================
  const renderSettings = () => (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-xl font-bold">Settings</h2>
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Store className="w-5 h-5 text-primary" /> Shop Information</h3>
        <div className="space-y-3">
          <div><label className="text-xs text-muted-foreground">Shop Name</label><input type="text" defaultValue="Nice & Neat" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Tagline</label><input type="text" defaultValue="Premium Barber Shop" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" defaultValue="254712345678" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
            <div><label className="text-xs text-muted-foreground">Email</label><input type="email" defaultValue="hello@niceandneat.co.ke" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground">Address</label><input type="text" defaultValue="Westlands Road, Nairobi" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
          <div><label className="text-xs text-muted-foreground">Receipt Footer</label><input type="text" defaultValue="Thank you for choosing Nice & Neat!" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" /></div>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-6">
        <h3 className="font-semibold mb-4">Data & Backup</h3>
        <p className="text-sm text-muted-foreground mb-3">Your data is stored locally and persists between sessions. All sales, expenses, clients, and reports are saved automatically.</p>
        <div className="flex gap-2">
          <button onClick={() => { fetchDashboard(); fetchServices(); fetchProducts(); fetchClients(); fetchBarbers(); fetchExpenses(); showToast('Data refreshed!', 'success'); }} className="px-4 py-2 btn-primary rounded-lg text-sm">Refresh Data</button>
        </div>
      </div>
    </div>
  );

  // ============================================
  // MODALS
  // ============================================
  const renderModals = () => (
    <>
      {/* New Service */}
      {showNewService && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewService(false)}>
          <div className="bg-card rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Add Service</h3><button onClick={() => setShowNewService(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Service Name</label><input type="text" value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} placeholder="e.g. Designer Cut" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Category</label><select value={newService.category} onChange={e => setNewService(s => ({ ...s, category: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option>Haircut</option><option>Shave</option><option>Beard</option><option>Kids</option><option>Style</option><option>Package</option><option>Other</option></select></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Price (KES)</label><input type="number" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground">Duration (min)</label><input type="number" value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </div>
              <button onClick={async () => { try { const r = await fetch('/api/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newService, price: parseFloat(newService.price), duration: parseInt(newService.duration) }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewService(false); setNewService({ name: '', category: 'Haircut', price: '', duration: '30' }); fetchServices(); showToast('Service added!', 'success'); } catch (e: any) { showToast(e.message, 'error'); } }} className="w-full py-2.5 btn-primary rounded-lg text-sm">Add Service</button>
            </div>
          </div>
        </div>
      )}

      {/* New Product */}
      {showNewProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewProduct(false)}>
          <div className="bg-card rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Add Product</h3><button onClick={() => setShowNewProduct(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Product Name</label><input type="text" value={newProduct.name} onChange={e => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Suavecito Pomade" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Category</label><select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option>Styling</option><option>Grooming</option><option>Aftercare</option><option>Supply</option></select></div>
                <div><label className="text-xs text-muted-foreground">Unit</label><input type="text" value={newProduct.unit} onChange={e => setNewProduct(p => ({ ...p, unit: e.target.value }))} placeholder="pcs, bottle, jar" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Selling Price</label><input type="number" value={newProduct.price} onChange={e => setNewProduct(p => ({ ...p, price: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground">Cost Price</label><input type="number" value={newProduct.costPrice} onChange={e => setNewProduct(p => ({ ...p, costPrice: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Quantity</label><input type="number" value={newProduct.quantity} onChange={e => setNewProduct(p => ({ ...p, quantity: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
                <div><label className="text-xs text-muted-foreground">Reorder Level</label><input type="number" value={newProduct.reorderLevel} onChange={e => setNewProduct(p => ({ ...p, reorderLevel: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              </div>
              <button onClick={async () => { try { const r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newProduct, price: parseFloat(newProduct.price), costPrice: parseFloat(newProduct.costPrice), quantity: parseInt(newProduct.quantity), reorderLevel: parseInt(newProduct.reorderLevel) }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewProduct(false); setNewProduct({ name: '', category: 'Styling', price: '', costPrice: '', quantity: '', reorderLevel: '5', unit: 'pcs' }); fetchProducts(); showToast('Product added!', 'success'); } catch (e: any) { showToast(e.message, 'error'); } }} className="w-full py-2.5 btn-primary rounded-lg text-sm">Add Product</button>
            </div>
          </div>
        </div>
      )}

      {/* New Client */}
      {showNewClient && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewClient(false)}>
          <div className="bg-card rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Add Client</h3><button onClick={() => setShowNewClient(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newClient.name} onChange={e => setNewClient(c => ({ ...c, name: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newClient.phone} onChange={e => setNewClient(c => ({ ...c, phone: e.target.value }))} placeholder="254712345678" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Notes (preferences)</label><textarea value={newClient.notes} onChange={e => setNewClient(c => ({ ...c, notes: e.target.value }))} placeholder="e.g. Likes skin fade, no clippers on top" className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary min-h-20" /></div>
              <button onClick={async () => { try { const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newClient }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewClient(false); setNewClient({ name: '', phone: '', email: '', notes: '' }); fetchClients(); showToast('Client added!', 'success'); } catch (e: any) { showToast(e.message, 'error'); } }} className="w-full py-2.5 btn-primary rounded-lg text-sm">Add Client</button>
            </div>
          </div>
        </div>
      )}

      {/* New Barber */}
      {showNewBarber && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowNewBarber(false)}>
          <div className="bg-card rounded-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">Add Barber</h3><button onClick={() => setShowNewBarber(false)} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Name</label><input type="text" value={newBarber.name} onChange={e => setNewBarber(b => ({ ...b, name: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div><label className="text-xs text-muted-foreground">Phone</label><input type="tel" value={newBarber.phone} onChange={e => setNewBarber(b => ({ ...b, phone: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-muted-foreground">Role</label><select value={newBarber.role} onChange={e => setNewBarber(b => ({ ...b, role: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option value="barber">Barber</option><option value="owner">Owner</option><option value="apprentice">Apprentice</option></select></div>
                <div><label className="text-xs text-muted-foreground">Commission Type</label><select value={newBarber.commissionType} onChange={e => setNewBarber(b => ({ ...b, commissionType: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"><option value="percentage">Percentage</option><option value="flat">Flat Rate</option></select></div>
              </div>
              <div><label className="text-xs text-muted-foreground">Commission Value (% or KES)</label><input type="number" value={newBarber.commissionValue} onChange={e => setNewBarber(b => ({ ...b, commissionValue: e.target.value }))} className="w-full px-3 py-2 mt-1 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary" /></div>
              <button onClick={async () => { try { const r = await fetch('/api/barbers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId, ...newBarber, commissionValue: parseFloat(newBarber.commissionValue) }) }); if (!r.ok) throw new Error((await r.json()).error); setShowNewBarber(false); setNewBarber({ name: '', phone: '', role: 'barber', commissionType: 'percentage', commissionValue: '60' }); fetchBarbers(); showToast('Barber added!', 'success'); } catch (e: any) { showToast(e.message, 'error'); } }} className="w-full py-2.5 btn-primary rounded-lg text-sm">Add Barber</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="flex min-h-screen">
      {renderSidebar()}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1 hover:bg-muted rounded"><Menu className="w-5 h-5" /></button>
            <h2 className="font-semibold text-lg capitalize">{currentView === 'new-sale' ? 'New Sale' : currentView === 'queue' ? 'Walk-In Queue' : currentView}</h2>
          </div>
          <button onClick={() => setIsDark(d => !d)} className="p-2 hover:bg-muted rounded-lg text-sm">{isDark ? '☀️' : '🌙'}</button>
        </header>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'new-sale' && renderNewSale()}
          {currentView === 'queue' && renderQueue()}
          {currentView === 'clients' && renderClients()}
          {currentView === 'expenses' && renderExpenses()}
          {currentView === 'reports' && renderReports()}
          {currentView === 'inventory' && renderInventory()}
          {currentView === 'barbers' && renderBarbers()}
          {currentView === 'settings' && renderSettings()}
        </div>
      </main>

      {renderModals()}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-in ${toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : toast.type === 'error' ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
