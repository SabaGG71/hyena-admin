import type { Route } from "./+types/profit";
import { Link } from "react-router";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Megaphone,
  Server,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Package2,
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const HOSTING_GEL = 35;
const HOSTING_DAY = 13;

function calcHostingExpenses(
  firstDate: Date,
  today: Date,
): { month: string; amount: number }[] {
  const result: { month: string; amount: number }[] = [];
  let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  while (
    cur.getFullYear() < today.getFullYear() ||
    (cur.getFullYear() === today.getFullYear() &&
      cur.getMonth() <= today.getMonth())
  ) {
    const billing = new Date(cur.getFullYear(), cur.getMonth(), HOSTING_DAY);
    if (billing <= today) {
      result.push({
        month: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`,
        amount: HOSTING_GEL,
      });
    }
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return result;
}

export async function loader() {
  const [products, orders, campaigns] = await Promise.all([
    getProducts(),
    getOrders(),
    getAdCampaigns(),
  ]);
  return { products, orders, campaigns };
}

export default function Profit({ loaderData }: Route.ComponentProps) {
  const { products, orders, campaigns } = loaderData;

  const today = new Date();

  // earliest activity date for hosting calculation
  const dates = [
    ...orders.map((o) => o.createdAt),
    ...products.map((p) => p.createdAt),
  ].sort();
  const firstDate = dates.length > 0 ? new Date(dates[0]) : today;
  const hostingMonths = calcHostingExpenses(firstDate, today);
  const totalHosting = hostingMonths.reduce((s, h) => s + h.amount, 0);

  // ── Totals (only sold bags) ──
  const totalRevenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalSoldQty = orders.reduce((s, o) => s + o.quantity, 0);

  // COGS: costPrice × quantity for each sale
  const totalCOGS = orders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? p.costPrice * o.quantity : 0);
  }, 0);

  // Variable per-sale costs (delivery + packaging + other)
  const totalVarExp = orders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? getVariableCostPerUnit(p) * o.quantity : 0);
  }, 0);

  const totalAdSpend = campaigns.reduce((s, c) => s + c.cost, 0);
  const totalExpenses = totalCOGS + totalVarExp + totalAdSpend + totalHosting;
  const totalProfit = totalRevenue - totalExpenses;
  const marginPct =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0";

  // ── This month ──
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const monthOrders = orders.filter((o) => o.createdAt.startsWith(thisMonth));
  const monthCampaigns = campaigns.filter((c) =>
    (c.startDate || c.createdAt).startsWith(thisMonth),
  );
  const monthHosting =
    hostingMonths.find((h) => h.month === thisMonth)?.amount ?? 0;

  const mRevenue = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
  const mCOGS = monthOrders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? p.costPrice * o.quantity : 0);
  }, 0);
  const mVarExp = monthOrders.reduce((s, o) => {
    const p = products.find((x) => x.id === o.productId);
    return s + (p ? getVariableCostPerUnit(p) * o.quantity : 0);
  }, 0);
  const mAdSpend = monthCampaigns.reduce((s, c) => s + c.cost, 0);
  const mProfit = mRevenue - mCOGS - mVarExp - mAdSpend - monthHosting;

  // ── Per-product breakdown ──
  interface ProdStat {
    productId: string;
    productName: string;
    qty: number;
    revenue: number;
    cogs: number;
    varExp: number;
    profit: number;
  }
  const prodMap = new Map<string, ProdStat>();
  for (const o of orders) {
    const p = products.find((x) => x.id === o.productId);
    const cur = prodMap.get(o.productId) ?? {
      productId: o.productId,
      productName: o.productName,
      qty: 0,
      revenue: 0,
      cogs: 0,
      varExp: 0,
      profit: 0,
    };
    cur.qty += o.quantity;
    cur.revenue += o.totalAmount;
    cur.cogs += p ? p.costPrice * o.quantity : 0;
    cur.varExp += p ? getVariableCostPerUnit(p) * o.quantity : 0;
    cur.profit = cur.revenue - cur.cogs - cur.varExp;
    prodMap.set(o.productId, cur);
  }
  const prodStats = Array.from(prodMap.values()).sort(
    (a, b) => b.profit - a.profit,
  );

  // ── Monthly chart data ──
  const monthMap = new Map<
    string,
    {
      revenue: number;
      cogs: number;
      varExp: number;
      adExp: number;
      hosting: number;
    }
  >();

  for (const o of orders) {
    const m = o.createdAt.substring(0, 7);
    const p = products.find((x) => x.id === o.productId);
    const cur = monthMap.get(m) ?? {
      revenue: 0,
      cogs: 0,
      varExp: 0,
      adExp: 0,
      hosting: 0,
    };
    cur.revenue += o.totalAmount;
    cur.cogs += p ? p.costPrice * o.quantity : 0;
    cur.varExp += p ? getVariableCostPerUnit(p) * o.quantity : 0;
    monthMap.set(m, cur);
  }
  for (const c of campaigns) {
    const m = (c.startDate || c.createdAt).substring(0, 7);
    const cur = monthMap.get(m) ?? {
      revenue: 0,
      cogs: 0,
      varExp: 0,
      adExp: 0,
      hosting: 0,
    };
    cur.adExp += c.cost;
    monthMap.set(m, cur);
  }
  for (const h of hostingMonths) {
    const cur = monthMap.get(h.month) ?? {
      revenue: 0,
      cogs: 0,
      varExp: 0,
      adExp: 0,
      hosting: 0,
    };
    cur.hosting += h.amount;
    monthMap.set(h.month, cur);
  }

  const chartData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, v]) => ({
      month: formatMonth(month),
      შემოსავალი: parseFloat(v.revenue.toFixed(2)),
      მოგება: parseFloat(
        (v.revenue - v.cogs - v.varExp - v.adExp - v.hosting).toFixed(2),
      ),
    }));

  // ── Source breakdown ──
  const sources = [
    "facebook",
    "instagram",
    "tiktok",
    "website",
    "other",
  ] as SaleSource[];
  const sourceStats = sources
    .map((src) => ({
      src,
      qty: orders
        .filter((o) => o.source === src)
        .reduce((s, o) => s + o.quantity, 0),
      revenue: orders
        .filter((o) => o.source === src)
        .reduce((s, o) => s + o.totalAmount, 0),
      count: orders.filter((o) => o.source === src).length,
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const profitPositive = totalProfit >= 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            გაყიდვების მოგება
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            მხოლოდ გაყიდული ჩანთების ხარჯი · ჰოსტინგი {HOSTING_GEL}₾/თვე
          </p>
        </div>
        <Link
          to="/finances"
          className="text-xs text-amber-700 hover:text-amber-800 font-medium bg-amber-50 hover:bg-amber-100 px-3 py-2 rounded-xl transition-colors"
        >
          ← ფინანსები
        </Link>
      </div>

      {/* Hero KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net profit - hero */}
        <div
          className={`col-span-2 lg:col-span-2 rounded-2xl p-6 ${profitPositive ? "bg-gradient-to-br from-amber-700 to-amber-800" : "bg-gradient-to-br from-red-500 to-red-700"} text-white shadow-lg`}
        >
          <div className="flex items-center gap-2 mb-4">
            {profitPositive ? (
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            ) : (
              <ArrowDownRight className="w-5 h-5 opacity-70" />
            )}
            <span className="text-sm font-medium opacity-80">
              სუფთა მოგება (სულ)
            </span>
          </div>
          <p className="text-4xl font-bold tracking-tight">
            {formatGEL(totalProfit)}
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm opacity-70">
            <span>მარჟა: {marginPct}%</span>
            <span>·</span>
            <span>{totalSoldQty} ჩანთა გაყიდული</span>
          </div>
        </div>

        <Card className="py-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-stone-500">
                სულ შემოსავალი
              </span>
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {formatGEL(totalRevenue)}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {orders.length} ორდერი
            </p>
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs font-medium text-stone-500">
                სულ ხარჯი
              </span>
            </div>
            <p className="text-2xl font-bold text-stone-900">
              {formatGEL(totalExpenses)}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              COGS + გასავალი + რეკლ.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* This month + expense breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* This month */}
        <Card className="lg:col-span-2 py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-stone-700">
              ამ თვის სურათი
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 space-y-3">
            {[
              {
                label: "შემოსავალი",
                value: mRevenue,
                color: "text-emerald-600",
              },
              {
                label: "საქ. ხარჯი (COGS)",
                value: mCOGS,
                color: "text-red-500",
              },
              { label: "ვარიაბ. ხარჯი", value: mVarExp, color: "text-red-400" },
              { label: "რეკლამა", value: mAdSpend, color: "text-amber-600" },
              {
                label: "ჰოსტინგი",
                value: monthHosting,
                color: "text-stone-500",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between"
              >
                <span className="text-xs text-stone-500">{row.label}</span>
                <span className={`text-sm font-semibold ${row.color}`}>
                  {formatGEL(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-stone-100/10 pt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-stone-700">
                მოგება
              </span>
              <span
                className={`text-base font-bold ${mProfit >= 0 ? "text-amber-700" : "text-red-600"}`}
              >
                {mProfit >= 0 ? "+" : ""}
                {formatGEL(mProfit)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expense breakdown */}
        <Card className="lg:col-span-3 py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-stone-700">
              ხარჯების სტრუქტურა (სულ)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  icon: ShoppingBag,
                  label: "საქონლის ხარჯი",
                  sub: "შესყიდვის ფასი × გაყიდვა",
                  value: totalCOGS,
                  bg: "bg-red-50",
                  iconColor: "text-red-500",
                },
                {
                  icon: Package2,
                  label: "ვარიაბ. ხარჯი",
                  sub: "მიწ. + შეფ. + სხვა",
                  value: totalVarExp,
                  bg: "bg-orange-50",
                  iconColor: "text-orange-500",
                },
                {
                  icon: Megaphone,
                  label: "რეკლამა",
                  sub: `${campaigns.length} კამპანია`,
                  value: totalAdSpend,
                  bg: "bg-amber-50",
                  iconColor: "text-amber-600",
                },
                {
                  icon: Server,
                  label: "ჰოსტინგი",
                  sub: `${hostingMonths.length} თვე × ${HOSTING_GEL}₾`,
                  value: totalHosting,
                  bg: "bg-stone-100",
                  iconColor: "text-stone-500",
                },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                    <span className="text-xs font-semibold text-stone-600">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-stone-900">
                    {formatGEL(item.value)}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 py-0">
          <CardHeader className="px-5 pt-5 pb-0">
            <CardTitle className="text-sm font-semibold text-stone-700">
              შემოსავალი vs მოგება (თვეების მიხედვით)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {chartData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-stone-400 text-sm">
                მონაცემი არ არის
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 12, right: 0, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#10b981"
                        stopOpacity={0.18}
                      />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="#7c3aed"
                        stopOpacity={0.18}
                      />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}₾`}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      fontSize: 12,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value) => [`${Number(value).toFixed(2)} ₾`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="შემოსავალი"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="url(#gRev)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="მოგება"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    fill="url(#gProfit)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="px-5 pt-5 pb-3">
            <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-stone-400" />
              გაყიდვის წყარო
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {sourceStats.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-8">
                ჯერ გაყიდვა არ არის
              </p>
            ) : (
              <div className="space-y-3">
                {sourceStats.map(({ src, revenue, qty }) => {
                  const pct =
                    totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={src}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[src]}`}
                          >
                            {SOURCE_LABELS[src]}
                          </span>
                          <span className="text-xs text-stone-400">
                            {qty} ცალი
                          </span>
                        </div>
                        <span className="text-xs font-bold text-stone-700">
                          {formatGEL(revenue)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-product table */}
      <Card className="py-0">
        <CardHeader className="px-5 pt-5 pb-0">
          <CardTitle className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-stone-400" />
            პროდუქტების ანალიზი ({prodStats.length} პოზიცია)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {prodStats.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-10">
              გაყიდვა ჯერ არ არის
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-stone-100/10 bg-stone-50/60">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500">
                      პროდუქტი
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500 hidden sm:table-cell">
                      რაოდ.
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500">
                      შემოსავალი
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500 hidden md:table-cell">
                      COGS
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500 hidden lg:table-cell">
                      ვარ. ხარჯი
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500">
                      მოგება
                    </th>
                    <th className="text-right px-5 py-3.5 text-xs font-semibold text-stone-500 hidden sm:table-cell">
                      მარჟა
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prodStats.map((ps, i) => {
                    const margin =
                      ps.revenue > 0
                        ? ((ps.profit / ps.revenue) * 100).toFixed(1)
                        : "0";
                    const isLast = i === prodStats.length - 1;
                    return (
                      <tr
                        key={ps.productId}
                        className={`border-t border-stone-100/10 hover:bg-stone-50/60 transition-colors ${isLast ? "rounded-b-xl" : ""}`}
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-stone-900 text-sm">
                            {ps.productName}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-right text-stone-500 hidden sm:table-cell">
                          {ps.qty}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                          {formatGEL(ps.revenue)}
                        </td>
                        <td className="px-5 py-4 text-right text-red-500 hidden md:table-cell">
                          {formatGEL(ps.cogs)}
                        </td>
                        <td className="px-5 py-4 text-right text-stone-400 hidden lg:table-cell">
                          {formatGEL(ps.varExp)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span
                            className={`font-bold text-sm ${ps.profit >= 0 ? "text-amber-700" : "text-red-600"}`}
                          >
                            {ps.profit >= 0 ? "+" : ""}
                            {formatGEL(ps.profit)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right hidden sm:table-cell">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              parseFloat(margin) >= 30
                                ? "bg-emerald-100 text-emerald-700"
                                : parseFloat(margin) >= 10
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-stone-200/10 bg-stone-50/80">
                    <td className="px-5 py-4 text-sm font-bold text-stone-700">
                      სულ
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-stone-600 hidden sm:table-cell">
                      {totalSoldQty}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-emerald-600">
                      {formatGEL(totalRevenue)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-red-500 hidden md:table-cell">
                      {formatGEL(totalCOGS)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-stone-400 hidden lg:table-cell">
                      {formatGEL(totalVarExp)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-bold text-amber-700">
                      {formatGEL(totalProfit)}
                    </td>
                    <td className="px-5 py-4 text-right hidden sm:table-cell">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          parseFloat(marginPct) >= 30
                            ? "bg-emerald-100 text-emerald-700"
                            : parseFloat(marginPct) >= 10
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {marginPct}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
