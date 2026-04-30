import type { Route } from './+types/orders';
import { Link, useFetcher, useSearchParams } from 'react-router';
import { useState } from 'react';
import React from 'react';
import {
  ShoppingCart, Trash2, SlidersHorizontal, TrendingUp,
  Package, ChevronDown, ChevronRight,
} from 'lucide-react';
import { getOrders, deleteOrder } from '~/data/store';
import { formatGEL, SOURCE_LABELS, SOURCE_COLORS } from '~/types';
import type { Order, SaleSource } from '~/types';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const source = url.searchParams.get('source') ?? 'all';
  const month = url.searchParams.get('month') ?? 'all';

  const all = await getOrders();
  let filtered = all;
  if (source !== 'all') filtered = filtered.filter(o => o.source === source);
  if (month !== 'all') filtered = filtered.filter(o => o.createdAt.startsWith(month));

  const totalRevenue = all.reduce((s, o) => s + o.totalAmount, 0);
  const totalQty = all.reduce((s, o) => s + o.quantity, 0);

  const sources = ['facebook', 'instagram', 'tiktok', 'website', 'other'] as SaleSource[];
  const sourceStats = sources.map(src => ({
    src,
    count: all.filter(o => o.source === src).length,
    revenue: all.filter(o => o.source === src).reduce((s, o) => s + o.totalAmount, 0),
  })).filter(s => s.count > 0);

  const months = Array.from(new Set(all.map(o => o.createdAt.substring(0, 7)))).sort().reverse();

  return { orders: filtered, source, month, months, totalRevenue, totalQty, sourceStats, totalCount: all.length };
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const act = fd.get('_action') as string;
  if (act === 'delete') {
    await deleteOrder(fd.get('id') as string);
  }
  if (act === 'deleteAll') {
    const ids = (fd.get('ids') as string).split(',').filter(Boolean);
    await Promise.all(ids.map(id => deleteOrder(id)));
  }
  return null;
}

type GroupedOrder = {
  key: string;
  productName: string;
  productImage: string | null | undefined;
  totalQty: number;
  totalAmount: number;
  sources: SaleSource[];
  latestDate: string;
  orders: Order[];
};

function groupOrders(orders: Order[]): GroupedOrder[] {
  const map: Record<string, GroupedOrder> = {};
  for (const o of orders) {
    const key = o.productName;
    if (!map[key]) {
      map[key] = {
        key,
        productName: o.productName,
        productImage: o.productImage,
        totalQty: 0,
        totalAmount: 0,
        sources: [],
        latestDate: o.createdAt,
        orders: [],
      };
    }
    const g = map[key];
    g.totalQty += o.quantity;
    g.totalAmount += o.totalAmount;
    if (!g.sources.includes(o.source)) g.sources.push(o.source);
    if (o.createdAt > g.latestDate) g.latestDate = o.createdAt;
    g.orders.push(o);
  }
  return Object.values(map).sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

function DeleteOneButton({ id }: { id: string }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== 'idle';
  return (
    <fetcher.Form method="post" onSubmit={e => { if (!window.confirm('ორდერი წაიშლება?')) e.preventDefault(); }}>
      <input type="hidden" name="_action" value="delete" />
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={busy}
        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
        <Trash2 className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
      </button>
    </fetcher.Form>
  );
}

function DeleteAllButton({ ids }: { ids: string[] }) {
  const fetcher = useFetcher();
  const busy = fetcher.state !== 'idle';
  return (
    <fetcher.Form method="post" onSubmit={e => { if (!window.confirm(`${ids.length} ორდერი წაიშლება?`)) e.preventDefault(); }}>
      <input type="hidden" name="_action" value="deleteAll" />
      <input type="hidden" name="ids" value={ids.join(',')} />
      <button type="submit" disabled={busy}
        className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40 border border-red-200">
        <Trash2 className={`w-3 h-3 ${busy ? 'animate-pulse' : ''}`} />
        {busy ? '...' : 'ყველა'}
      </button>
    </fetcher.Form>
  );
}

export default function Orders({ loaderData }: Route.ComponentProps) {
  const { orders, source, month, months, totalRevenue, totalQty, sourceStats, totalCount } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function setParam(key: string, val: string) {
    const p = new URLSearchParams(searchParams);
    val === 'all' ? p.delete(key) : p.set(key, val);
    setSearchParams(p, { replace: true });
  }

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const sources = ['all', 'facebook', 'instagram', 'tiktok', 'website', 'other'] as const;
  const grouped = groupOrders(orders);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ორდერები</h1>
        <p className="text-stone-500 text-sm mt-0.5">გაყიდვების ჩანაწერები</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">სულ ჩანაწერი</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">სულ შემოსავალი</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{formatGEL(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <p className="text-sm text-stone-500">სულ გაყიდული</p>
          <p className="text-2xl font-bold text-stone-700 mt-1">{totalQty} ჩანთა</p>
        </div>
      </div>

      {/* Source stats */}
      {sourceStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-stone-400" />
            <p className="text-sm font-semibold text-stone-600">გაყიდვის წყარო</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {sourceStats.map(({ src, count, revenue }) => (
              <button key={src} onClick={() => setParam('source', src === source ? 'all' : src)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${source === src ? 'border-amber-300 bg-amber-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[src]}`}>{SOURCE_LABELS[src]}</span>
                <span className="font-semibold text-stone-700">{count}</span>
                <span className="text-stone-400 text-xs">· {formatGEL(revenue)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <SlidersHorizontal className="w-4 h-4 text-stone-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-stone-500">წყარო:</span>
            {sources.map(s => (
              <button key={s} onClick={() => setParam('source', s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${source === s ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                {s === 'all' ? 'ყველა' : SOURCE_LABELS[s as SaleSource]}
              </button>
            ))}
          </div>
          {months.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-stone-500">თვე:</span>
              <button onClick={() => setParam('month', 'all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${month === 'all' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                ყველა
              </button>
              {months.map(m => (
                <button key={m} onClick={() => setParam('month', m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${month === m ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {grouped.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <ShoppingCart className="w-14 h-14 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-600 font-semibold">ორდერი ვერ მოიძებნა</p>
          <Link to="/products" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors">
            <ShoppingCart className="w-4 h-4" />ჩანთები
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="w-8 px-3 py-3.5" />
                  <th className="text-left px-4 py-3.5 font-semibold text-stone-600">პროდუქტი</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-stone-600">სულ რაოდ.</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-stone-600">სულ თანხა</th>
                  <th className="text-center px-4 py-3.5 font-semibold text-stone-600 hidden md:table-cell">წყარო</th>
                  <th className="text-right px-4 py-3.5 font-semibold text-stone-600 hidden lg:table-cell">მოქმ.</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map(group => {
                  const isOpen = expanded.has(group.key);
                  const multiOrder = group.orders.length > 1;
                  return (
                    <React.Fragment key={group.key}>
                      {/* Group header row */}
                      <tr
                        className={`border-b border-stone-100 transition-colors ${multiOrder ? 'cursor-pointer hover:bg-stone-50/70' : 'hover:bg-stone-50/40'}`}
                        onClick={() => multiOrder && toggleExpand(group.key)}
                      >
                        <td className="px-3 py-4 text-center text-stone-400">
                          {multiOrder
                            ? isOpen ? <ChevronDown className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />
                            : null}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5">
                            {group.productImage ? (
                              <img src={group.productImage} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-stone-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-stone-900 text-sm">{group.productName}</p>
                              {multiOrder && (
                                <p className="text-xs text-stone-400 mt-0.5">{group.orders.length} ცალ ჩანაწერი · დააჭირე სანახავად</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-lg font-bold text-stone-800">{group.totalQty}</span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-emerald-600">{formatGEL(group.totalAmount)}</td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {group.sources.map(src => (
                              <span key={src} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[src]}`}>
                                {SOURCE_LABELS[src]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            {multiOrder
                              ? <DeleteAllButton ids={group.orders.map(o => o.id)} />
                              : <DeleteOneButton id={group.orders[0].id} />}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded individual orders */}
                      {isOpen && group.orders.map(order => (
                        <tr key={order.id} className="bg-amber-50/30 border-b border-stone-100/80">
                          <td className="px-3 py-3" />
                          <td className="px-4 py-3 pl-12">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-white px-2 py-1 rounded-lg text-stone-500 border border-stone-100">{order.orderCode}</span>
                              {order.notes && <span className="text-xs text-stone-400 truncate max-w-32">{order.notes}</span>}
                            </div>
                            <p className="text-xs text-stone-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('ka-GE')}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-stone-600">{order.quantity}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{formatGEL(order.totalAmount)}</td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${SOURCE_COLORS[order.source]}`}>
                              {SOURCE_LABELS[order.source]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right hidden lg:table-cell">
                            <DeleteOneButton id={order.id} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 text-sm text-stone-500">
            {grouped.length} პროდუქტი · {orders.length} ჩანაწერი ნაჩვენებია
          </div>
        </div>
      )}
    </div>
  );
}
