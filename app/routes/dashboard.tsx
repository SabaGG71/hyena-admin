import type { Route } from "./+types/dashboard";
import type { ClientLoaderFunctionArgs } from "react-router";
import { Link } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  Megaphone,
  ShoppingCart,
  Package,
  ArrowRight,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { getProducts, getOrders, getAdCampaigns } from "~/data/store";
import {
  getVariableCostPerUnit,
  formatGEL,
  formatMonth,
  SOURCE_LABELS,
  SOURCE_COLORS,
} from "~/types";
import type { SaleSource } from "~/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export async function loader() {
  const [products, orders, campaigns] = await Promise.all([
    getProducts(),
    getOrders(),
    getAdCampaigns(),
  ]);
  return { products, orders, campaigns };
}

// ── Client-side stale-while-revalidate cache (20 s) ──────────────────────────
let _cache: { data: Awaited<ReturnType<typeof loader>>; at: number } | null =
  null;

export async function clientLoader({ serverLoader }: ClientLoaderFunctionArgs) {
  if (_cache && Date.now() - _cache.at < 20_000) {
    serverLoader<typeof loader>().then((d) => {
      _cache = { data: d, at: Date.now() };
    });
    return _cache.data;
  }
  const data = await serverLoader<typeof loader>();
  _cache = { data, at: Date.now() };
  return data;
}
clientLoader.hydrate = true;

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { products, orders, campaigns } = loaderData;

  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSoldQty = orders.reduce((s, o) => s + o.quantity, 0);
  const totalInventoryExp = products.reduce(
    (s, p) => s + p.costPrice * p.stock,
    0,
  );
  const totalSaleExp = orders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? getVariableCostPerUnit(p) * o.quantity : 0);
  }, 0);
  const totalAdSpend = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalExpenses = totalInventoryExp + totalSaleExp + totalAdSpend;
  const totalProfit = totalRevenue - totalExpenses;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthOrders = orders.filter((o) => o.createdAt.startsWith(thisMonth));
  const monthRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const monthSoldQty = monthOrders.reduce((s, o) => s + o.quantity, 0);
  const monthInventoryExp = products
    .filter((p) => p.createdAt.startsWith(thisMonth))
    .reduce((s, p) => s + p.costPrice * p.stock, 0);
  const monthSaleExp = monthOrders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? getVariableCostPerUnit(p) * o.quantity : 0);
  }, 0);
  const monthAdSpend = campaigns
    .filter((c) => (c.startDate || c.createdAt).startsWith(thisMonth))
    .reduce((s, c) => s + c.cost, 0);
  const monthProfit =
    monthRevenue - monthInventoryExp - monthSaleExp - monthAdSpend;

  // Monthly chart
  const mMap = new Map<string, { rev: number; profit: number }>();
  for (const o of orders) {
    const m = o.createdAt.substring(0, 7);
    const p = products.find((x) => x.id === o.productId);
    const cur = mMap.get(m) ?? { rev: 0, profit: 0 };
    cur.rev += o.totalAmount;
    cur.profit +=
      o.totalAmount -
      (p
        ? getVariableCostPerUnit(p) * o.quantity + p.costPrice * o.quantity
        : 0);
    mMap.set(m, cur);
  }
  for (const c of campaigns) {
    const m = (c.startDate || c.createdAt).substring(0, 7);
    const cur = mMap.get(m) ?? { rev: 0, profit: 0 };
    cur.profit -= c.cost;
    mMap.set(m, cur);
  }
  const chartData = Array.from(mMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([month, v]) => ({
      month: formatMonth(month),
      შემოსავალი: +v.rev.toFixed(2),
      მოგება: +v.profit.toFixed(2),
    }));

  // Source breakdown
  const sources: SaleSource[] = [
    "facebook",
    "instagram",
    "tiktok",
    "website",
    "other",
  ];
  const sourceStats = sources
    .map((src) => ({
      src,
      revenue: orders
        .filter((o) => o.source === src)
        .reduce((s, o) => s + o.totalAmount, 0),
      qty: orders
        .filter((o) => o.source === src)
        .reduce((s, o) => s + o.quantity, 0),
      count: orders.filter((o) => o.source === src).length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Inventory
  const totalStock = products.reduce((s, p) => s + p.stock, 0);
  const soldPct =
    totalStock > 0 ? Math.round((totalSoldQty / totalStock) * 100) : 0;

  const recentOrders = orders.slice(0, 5);
  const isProfit = monthProfit >= 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ── Page title ────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-stone-800 tracking-tight">
          დაშბორდი
        </h1>
        <p className="text-stone-400 text-sm mt-0.5">
          Hyena-ს ფინანსური მიმოხილვა
        </p>
      </div>

      {/* ── Hero row ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Profit hero */}
        <div
          className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #1e1108 0%, #4a2810 45%, #7a4018 100%)",
            boxShadow:
              "0 8px 40px rgba(60,30,10,0.3), inset 0 1px 0 rgba(255,200,100,0.08)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(ellipse at 80% 10%, rgba(250,200,100,0.1) 0%, transparent 60%), radial-gradient(ellipse at 20% 90%, rgba(180,83,9,0.12) 0%, transparent 50%)",
            }}
          />
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3"
            style={{ color: "rgba(245,200,120,0.5)" }}
          >
            ამ თვის მოგება
          </p>
          <p
            className={`text-[42px] font-bold tracking-tight leading-none ${isProfit ? "text-amber-100" : "text-red-500"}`}
          >
            {formatGEL(monthProfit)}
          </p>
          <div className="flex items-center gap-2.5 mt-4">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg"
              style={{
                background: "rgba(255,200,100,0.1)",
                color: "rgba(245,200,120,0.7)",
              }}
            >
              {isProfit ? (
                <TrendingUp style={{ width: 11, height: 11 }} />
              ) : (
                <TrendingDown style={{ width: 11, height: 11 }} />
              )}
              {monthSoldQty} გაყიდული
            </span>
            <span
              className="text-[11px]"
              style={{ color: "rgba(245,200,120,0.35)" }}
            >
              სულ:{" "}
              <span style={{ color: "rgba(245,200,120,0.7)" }}>
                {formatGEL(totalProfit)}
              </span>
            </span>
          </div>
        </div>

        {/* Revenue */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-0.75 h-full rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, #c47020, #7c3a0e)" }}
          />
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(196,112,32,0.12)" }}
            >
              <TrendingUp style={{ width: 14, height: 14, color: "#c47020" }} />
            </div>
            <span className="text-[11px] font-medium text-stone-400">
              შემოსავალი
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight">
            {formatGEL(monthRevenue)}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            სულ {formatGEL(totalRevenue)}
          </p>
        </div>

        {/* Expenses */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="absolute top-0 left-0 w-0.75 h-full rounded-l-2xl"
            style={{ background: "linear-gradient(180deg, #78716c, #44403c)" }}
          />
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(120,113,108,0.1)" }}
            >
              <TrendingDown
                style={{ width: 14, height: 14, color: "#78716c" }}
              />
            </div>
            <span className="text-[11px] font-medium text-stone-400">
              ხარჯი
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-800 tracking-tight">
            {formatGEL(monthInventoryExp + monthSaleExp + monthAdSpend)}
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            სულ {formatGEL(totalExpenses)}
          </p>
        </div>
      </div>

      {/* ── Second row: quick stats ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            icon: Wallet,
            label: "სულ შემოსავალი",
            value: formatGEL(totalRevenue),
            sub: `${orders.length} ორდერი`,
            accent: "#c47020",
          },
          {
            icon: ShoppingBag,
            label: "ინვენტარი (ღირ.)",
            value: formatGEL(totalInventoryExp),
            sub: `${products.length} პროდუქტი`,
            accent: "#78716c",
          },
          {
            icon: Megaphone,
            label: "სულ რეკლამა",
            value: formatGEL(totalAdSpend),
            sub: `${campaigns.length} კამპ.`,
            accent: "#b45309",
          },
          {
            icon: Package,
            label: "სტოკი",
            value: `${totalStock - totalSoldQty} / ${totalStock}`,
            sub: `${soldPct}% გაყიდული`,
            accent: "#57534e",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: "var(--bg-card)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div
              className="absolute top-0 left-0 w-0.75 h-full rounded-l-2xl"
              style={{ background: item.accent }}
            />
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${item.accent}18` }}
            >
              <item.icon
                style={{ width: 14, height: 14, color: item.accent }}
              />
            </div>
            <p className="text-xl font-bold text-stone-800 tracking-tight">
              {item.value}
            </p>
            <p className="text-[11px] font-medium text-stone-500 mt-0.5">
              {item.label}
            </p>
            <p className="text-[11px] text-stone-400 mt-0.5">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chart + Source ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Area chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-5 border"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <p className="text-sm font-semibold text-stone-700 mb-4">
            შემოსავალი vs მოგება
          </p>
          {chartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-stone-400 text-sm">
              მონაცემი არ არის
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#92400e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#92400e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e7e5e0"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#a8a29e" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}₾`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid var(--card-border)",
                    fontSize: 12,
                    backgroundColor: "var(--bg-card)",
                    color: "var(--text-1)",
                  }}
                  formatter={(v) => [`${Number(v).toFixed(2)} ₾`]}
                />
                <Area
                  type="monotone"
                  dataKey="შემოსავალი"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fill="url(#gR)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#d97706" }}
                />
                <Area
                  type="monotone"
                  dataKey="მოგება"
                  stroke="#92400e"
                  strokeWidth={2.5}
                  fill="url(#gP)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#92400e" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Source breakdown */}
        <div
          className="rounded-2xl p-5 border"
          style={{
            background: "var(--bg-card)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <p className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-stone-400" />
            გაყიდვის წყარო
          </p>
          {sourceStats.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">
              გაყიდვა ჯერ არ არის
            </p>
          ) : (
            <div className="space-y-4">
              {sourceStats.map(({ src, revenue, qty }) => {
                const pct =
                  totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={src}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[src]}`}
                        >
                          {SOURCE_LABELS[src]}
                        </span>
                        <span className="text-xs text-stone-400">{qty} ც.</span>
                      </div>
                      <span className="text-xs font-bold text-stone-700">
                        {formatGEL(revenue)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, #d97706, #92400e)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Inventory progress ────────────────────────── */}
      <div
        className="rounded-2xl p-5 border"
        style={{
          background: "var(--bg-card)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-stone-400" />
            სტოკის მდგომარეობა
          </p>
          <span className="text-xs text-stone-400">{soldPct}% გაყიდული</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {
              label: "სულ სტოკი",
              value: totalStock,
              color: "text-stone-700",
              bg: "bg-stone-50 border-stone-200",
            },
            {
              label: "გაყიდული",
              value: totalSoldQty,
              color: "text-amber-700",
              bg: "bg-amber-50 border-amber-200",
            },
            {
              label: "დარჩა",
              value: totalStock - totalSoldQty,
              color: "text-stone-500",
              bg: "bg-stone-50 border-stone-200",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`${item.bg} border rounded-xl p-3 text-center`}
            >
              <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-stone-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${soldPct}%`,
              background: "linear-gradient(90deg, #d97706, #92400e)",
            }}
          />
        </div>
      </div>

      {/* ── Recent orders ─────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{
          background: "var(--bg-card)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-stone-400" />
            ბოლო ორდერები
          </p>
          <Link
            to="/orders"
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 font-semibold transition-colors"
          >
            ყველა <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-10">
            ორდერი ჯერ არ არის
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--table-head)" }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400">
                    კოდი
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-400">
                    პროდუქტი
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400 hidden sm:table-cell">
                    რაოდ.
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-stone-400">
                    ჯამი
                  </th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-stone-400 hidden md:table-cell">
                    წყარო
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr
                    key={order.id}
                    className={`border-t border-stone-100 hover:bg-stone-50/60 transition-colors ${i === recentOrders.length - 1 ? "" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-lg">
                        {order.orderCode}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {order.productImage && (
                          <img
                            src={order.productImage}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <span className="font-medium text-stone-900 text-xs line-clamp-1">
                          {order.productName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-stone-500 hidden sm:table-cell">
                      {order.quantity}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-amber-700">
                        {formatGEL(order.totalAmount)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center hidden md:table-cell">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[order.source]}`}
                      >
                        {SOURCE_LABELS[order.source]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
