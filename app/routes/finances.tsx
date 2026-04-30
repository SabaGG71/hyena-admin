import type { Route } from './+types/finances';
import { TrendingUp, TrendingDown, DollarSign, Megaphone, ArrowUpRight, ArrowDownRight, BarChart3, ShoppingBag, Package } from 'lucide-react';
import { getProducts, getOrders, getAdCampaigns } from '~/data/store';
import { getVariableCostPerUnit, formatGEL, formatMonth, SOURCE_LABELS, SOURCE_COLORS } from '~/types';
import type { SaleSource } from '~/types';
import StatsCard from '~/components/StatsCard';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MonthStats {
  month: string;
  revenue: number;
  inventoryExp: number;  // costPrice × stock (new bags added this month)
  saleExp: number;       // delivery + packaging + other × sold qty
  adExp: number;
  expenses: number;
  profit: number;
  soldQty: number;
  orderCount: number;
}

const emptyMonth = (month: string): MonthStats => ({
  month, revenue: 0, inventoryExp: 0, saleExp: 0, adExp: 0, expenses: 0, profit: 0, soldQty: 0, orderCount: 0,
});

export async function loader() {
  const [products, orders, campaigns] = await Promise.all([
    getProducts(),
    getOrders(),
    getAdCampaigns(),
  ]);

  const monthMap = new Map<string, MonthStats>();

  // 1) Inventory purchase cost — counted when product is added
  for (const p of products) {
    const month = p.createdAt.substring(0, 7);
    const m = monthMap.get(month) ?? emptyMonth(month);
    m.inventoryExp += p.costPrice * p.stock;
    monthMap.set(month, m);
  }

  // 2) Per-sale variable costs (delivery, packaging, other — NOT costPrice)
  for (const order of orders) {
    const month = order.createdAt.substring(0, 7);
    const p = products.find(x => x.id === order.productId);
    const variableCost = p ? getVariableCostPerUnit(p) * order.quantity : 0;
    const m = monthMap.get(month) ?? emptyMonth(month);
    m.revenue += order.totalAmount;
    m.saleExp += variableCost;
    m.soldQty += order.quantity;
    m.orderCount += 1;
    monthMap.set(month, m);
  }

  // 3) Ad spend
  for (const c of campaigns) {
    const month = c.startDate.substring(0, 7) || c.createdAt.substring(0, 7);
    const m = monthMap.get(month) ?? emptyMonth(month);
    m.adExp += c.cost;
    monthMap.set(month, m);
  }

  const monthly: MonthStats[] = Array.from(monthMap.values())
    .map(m => ({
      ...m,
      expenses: m.inventoryExp + m.saleExp + m.adExp,
      profit: m.revenue - m.inventoryExp - m.saleExp - m.adExp,
    }))
    .sort((a, b) => b.month.localeCompare(a.month));

  const totals = monthly.reduce((acc, m) => ({
    revenue: acc.revenue + m.revenue,
    expenses: acc.expenses + m.expenses,
    profit: acc.profit + m.profit,
    adSpend: acc.adSpend + m.adExp,
    soldQty: acc.soldQty + m.soldQty,
    orderCount: acc.orderCount + m.orderCount,
    inventoryExp: acc.inventoryExp + m.inventoryExp,
  }), { revenue: 0, expenses: 0, profit: 0, adSpend: 0, soldQty: 0, orderCount: 0, inventoryExp: 0 });

  // Source breakdown
  const sources = ['facebook', 'instagram', 'tiktok', 'website', 'other'] as SaleSource[];
  const sourceStats = sources.map(src => {
    const srcOrders = orders.filter(o => o.source === src);
    const revenue = srcOrders.reduce((s, o) => s + o.totalAmount, 0);
    const saleExp = srcOrders.reduce((s, o) => {
      const p = products.find(x => x.id === o.productId);
      return s + (p ? getVariableCostPerUnit(p) * o.quantity : 0);
    }, 0);
    const qty = srcOrders.reduce((s, o) => s + o.quantity, 0);
    return { src, revenue, profit: revenue - saleExp, qty, count: srcOrders.length };
  }).filter(s => s.count > 0).sort((a, b) => b.revenue - a.revenue);

  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1);
  const inventoryCount = products.reduce((s, p) => s + p.stock, 0);

  return { monthly, totals, sourceStats, campaigns, maxRevenue, inventoryCount };
}

export default function Finances({ loaderData }: Route.ComponentProps) {
  const { monthly, totals, sourceStats, campaigns, maxRevenue, inventoryCount } = loaderData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ფინანსები</h1>
        <p className="text-stone-500 text-sm mt-0.5">შემოსავლის, გასავლისა და მოგების ანგარიში</p>
      </div>

      {/* All-time totals */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">სულ — {totals.orderCount} ორდერი · {totals.soldQty} ჩანთა</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard label="სულ შემოსავალი" value={formatGEL(totals.revenue)} icon={TrendingUp} color="emerald" />
          <StatsCard label="სულ გასავალი" value={formatGEL(totals.expenses)} icon={TrendingDown} color="rose" />
          <StatsCard label="სულ მოგება" value={formatGEL(totals.profit)} icon={DollarSign} color="violet" />
          <StatsCard label="სულ რეკლამა" value={formatGEL(totals.adSpend)} icon={Megaphone} color="amber" />
        </div>
      </section>

      {/* Expense breakdown */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">გასავლის დეტალი</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">შეძენის ხარჯი</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatGEL(totals.inventoryExp)}</p>
            <p className="text-xs text-stone-400 mt-1">costPrice × stock — ყველა ჩანთა</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">გაყიდვის ხარჯი</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{formatGEL(totals.expenses - totals.inventoryExp - totals.adSpend)}</p>
            <p className="text-xs text-stone-400 mt-1">მიტანა + შეფუთვა + სხვა</p>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">სარეკლამო ხარჯი</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{formatGEL(totals.adSpend)}</p>
            <p className="text-xs text-stone-400 mt-1">ყველა კამპანიის ჯამი</p>
          </div>
        </div>
      </section>

      {/* Source breakdown */}
      {sourceStats.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">გაყიდვის წყაროების ანალიზი</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {sourceStats.map(({ src, revenue, profit, qty, count }) => (
              <div key={src} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${SOURCE_COLORS[src]}`}>
                  {SOURCE_LABELS[src]}
                </span>
                <p className="text-xl font-bold text-stone-900 mt-3">{formatGEL(revenue)}</p>
                <p className={`text-sm font-semibold mt-0.5 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {profit >= 0 ? '+' : ''}{formatGEL(profit)} მოგება
                </p>
                <p className="text-xs text-stone-400 mt-2">{count} ორდ. · {qty} ჩანთა</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bar chart */}
      {monthly.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">თვიური შემოსავალი vs მოგება</h2>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[...monthly].reverse()} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(v: string) => v.substring(5)} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₾${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  formatter={(value, name) => [formatGEL(Number(value)), name === 'revenue' ? 'შემოსავალი' : 'მოგება']}
                  labelFormatter={(label) => formatMonth(String(label))}
                />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} name="revenue" />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} name="profit" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-stone-500"><span className="w-3 h-3 rounded-sm bg-amber-700 inline-block" />შემოსავალი</span>
              <span className="flex items-center gap-1.5 text-xs text-stone-500"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />მოგება</span>
            </div>
          </div>
        </section>
      )}

      {/* Monthly table */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-stone-400" />
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">თვიური ანგარიში</h2>
        </div>
        {monthly.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <DollarSign className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-500">გაყიდვები ჯერ არ არის</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="text-left px-5 py-3.5 font-semibold text-stone-600">თვე</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-stone-600">შემოსავალი</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-stone-600 hidden sm:table-cell">შეძენა + გაყ.</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-stone-600">რეკლამა</th>
                    <th className="text-right px-5 py-3.5 font-semibold text-stone-600">მოგება</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-stone-600 hidden md:table-cell">გაყიდვა</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {monthly.map(m => {
                    const marginPct = m.revenue > 0 ? ((m.profit / m.revenue) * 100).toFixed(0) : '0';
                    return (
                      <tr key={m.month} className="hover:bg-stone-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-stone-900">{formatMonth(m.month)}</p>
                          <p className="text-xs text-stone-400 mt-0.5">მარჟა: {marginPct}%</p>
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-600">{formatGEL(m.revenue)}</td>
                        <td className="px-5 py-4 text-right text-stone-500 hidden sm:table-cell">{formatGEL(m.inventoryExp + m.saleExp)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-amber-600">{formatGEL(m.adExp)}</td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {m.profit >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                            <span className={`font-bold ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {m.profit >= 0 ? '+' : ''}{formatGEL(m.profit)}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center hidden md:table-cell">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">{m.soldQty}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 border-t-2 border-stone-200">
                    <td className="px-5 py-4 font-bold text-stone-900">სულ</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-700">{formatGEL(totals.revenue)}</td>
                    <td className="px-5 py-4 text-right font-bold text-stone-600 hidden sm:table-cell">{formatGEL(totals.inventoryExp + (totals.expenses - totals.inventoryExp - totals.adSpend))}</td>
                    <td className="px-5 py-4 text-right font-bold text-amber-700">{formatGEL(totals.adSpend)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-bold text-base ${totals.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {totals.profit >= 0 ? '+' : ''}{formatGEL(totals.profit)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-amber-800 hidden md:table-cell">{totals.soldQty}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Ad campaigns list */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-stone-400" />
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">გაშვებული კამპანიები</h2>
          </div>
          <a href="/ads" className="text-sm text-amber-700 hover:text-amber-800 font-medium">მართვა →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.slice(0, 6).map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{c.name}</p>
                  {c.productName && <p className="text-xs text-stone-400 mt-0.5">{c.productName}</p>}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${SOURCE_COLORS[c.platform]}`}>
                  {SOURCE_LABELS[c.platform]}
                </span>
              </div>
              <p className="text-xl font-bold text-amber-600 mt-3">{formatGEL(c.cost)}</p>
              <p className="text-xs text-stone-400 mt-1">{c.startDate} — {c.endDate || 'მიმდინარე'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
