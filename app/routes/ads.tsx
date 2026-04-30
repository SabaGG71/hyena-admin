import type { Route } from './+types/ads';
import { Form, useNavigation } from 'react-router';
import { useState } from 'react';
import { Megaphone, Plus, Trash2, TrendingDown, Calendar, Clock } from 'lucide-react';
import { getAdCampaigns, getProducts, deleteAdCampaign, createAdCampaign } from '~/data/store';
import { formatGEL, PLATFORM_LABELS, PLATFORM_COLORS, calcAdDays } from '~/types';
import type { AdPlatform } from '~/types';

export async function loader() {
  const [campaigns, products] = await Promise.all([getAdCampaigns(), getProducts()]);

  const platforms = ['facebook', 'instagram', 'tiktok', 'website', 'other'] as AdPlatform[];
  const platformStats = platforms.map(p => ({
    platform: p,
    total: campaigns.filter(c => c.platform === p).reduce((s, c) => s + c.cost, 0),
    count: campaigns.filter(c => c.platform === p).length,
  })).filter(s => s.count > 0);

  const totalAdSpend = campaigns.reduce((s, c) => s + c.cost, 0);

  return { campaigns, products, platformStats, totalAdSpend };
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const act = fd.get('_action') as string;

  if (act === 'delete') {
    await deleteAdCampaign(fd.get('id') as string);
    return null;
  }

  if (act === 'create') {
    const productId = fd.get('productId') as string;
    const products = await getProducts();
    const product = products.find(p => p.id === productId);

    await createAdCampaign({
      name: fd.get('name') as string,
      platform: fd.get('platform') as AdPlatform,
      cost: parseFloat(fd.get('cost') as string) || 0,
      productId: productId || '',
      productName: product?.name || '',
      startDate: fd.get('startDate') as string,
      endDate: fd.get('endDate') as string || '',
      notes: fd.get('notes') as string || '',
    });
  }

  return null;
}

function AdForm({ products }: { products: { id: string; name: string }[] }) {
  const navigation = useNavigation();
  const isCreating = navigation.state === 'submitting';

  const today = new Date().toISOString().split('T')[0];
  const [dailyMode, setDailyMode] = useState(false);
  const [dailyRate, setDailyRate] = useState(0);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState('');

  const days = dailyMode && startDate && endDate ? calcAdDays(startDate, endDate) : 1;
  const computedTotal = dailyMode ? dailyRate * days : 0;

  const platforms: AdPlatform[] = ['facebook', 'instagram', 'tiktok', 'website', 'other'];

  return (
    <Form method="post" className="space-y-4">
      <input type="hidden" name="_action" value="create" />

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">კამპანიის სახელი <span className="text-red-500">*</span></label>
        <input type="text" name="name" required placeholder="მაგ: Facebook — აპრილი"
          className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 placeholder-stone-400" />
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">პლატფორმა <span className="text-red-500">*</span></label>
        <select name="platform" required
          className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white">
          {platforms.map(p => <option key={p} value={p}>{PLATFORM_LABELS[p]}</option>)}
        </select>
      </div>

      {/* Cost mode toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-stone-600">ხარჯი <span className="text-red-500">*</span></label>
          <button type="button" onClick={() => setDailyMode(d => !d)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${dailyMode ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'}`}>
            <Clock className="w-3 h-3" />
            {dailyMode ? 'დღიური ×  დღე' : 'სულ ხარჯი'}
          </button>
        </div>

        {dailyMode ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input type="number" min="0" step="0.01" placeholder="0.00" value={dailyRate || ''}
                  onChange={e => setDailyRate(parseFloat(e.target.value) || 0)}
                  className="w-full pr-8 px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs">₾/დღე</span>
              </div>
              <span className="text-stone-400 text-sm">×</span>
              <span className="px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-700 min-w-[3rem] text-center">{days}</span>
              <span className="text-stone-400 text-sm">=</span>
              <span className={`px-3 py-2.5 rounded-xl text-sm font-bold min-w-[5rem] text-center ${computedTotal > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-stone-50 text-stone-400 border border-stone-200'}`}>
                {formatGEL(computedTotal)}
              </span>
            </div>
            <input type="hidden" name="cost" value={computedTotal} />
            {endDate && startDate && (
              <p className="text-xs text-stone-400">{startDate} — {endDate} = {days} დღე · სულ {formatGEL(computedTotal)}</p>
            )}
          </div>
        ) : (
          <div className="relative">
            <input type="number" name="cost" min="0" step="0.01" required placeholder="0.00"
              className="w-full pr-8 px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₾</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">პროდუქტი (სურ.)</label>
        <select name="productId"
          className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white">
          <option value="">-- ყველა პროდუქტი --</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">დაწყება <span className="text-red-500">*</span></label>
          <input type="date" name="startDate" value={startDate} required
            onChange={e => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1.5">დამთავრება</label>
          <input type="date" name="endDate" value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1.5">შენიშვნა</label>
        <textarea name="notes" rows={2} placeholder="სურვილისამებრ..."
          className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none placeholder-stone-400" />
      </div>

      <button type="submit" disabled={isCreating}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-60 transition-colors">
        <Megaphone className="w-4 h-4" />{isCreating ? 'ინახება...' : 'კამპანიის დამატება'}
      </button>
    </Form>
  );
}

export default function Ads({ loaderData }: Route.ComponentProps) {
  const { campaigns, products, platformStats, totalAdSpend } = loaderData;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">რეკლამა</h1>
        <p className="text-stone-500 text-sm mt-0.5">სარეკლამო კამპანიების მართვა</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-stone-500">სულ დახარჯული</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{formatGEL(totalAdSpend)}</p>
          <p className="text-xs text-stone-400 mt-1">{campaigns.length} კამპანია</p>
        </div>
        {platformStats.map(({ platform, total, count }) => (
          <div key={platform} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${PLATFORM_COLORS[platform]}`}>
              {PLATFORM_LABELS[platform]}
            </span>
            <p className="text-xl font-bold text-stone-900 mt-2">{formatGEL(total)}</p>
            <p className="text-xs text-stone-400 mt-1">{count} კამპანია</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 sticky top-6">
            <h2 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-600" />ახალი კამპანია
            </h2>
            <AdForm products={products} />
          </div>
        </div>

        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />კამპანიების სია ({campaigns.length})
          </h2>

          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <Megaphone className="w-12 h-12 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-500">კამპანია ჯერ არ არის</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => {
                const hasDates = c.startDate && c.endDate;
                const days = hasDates ? calcAdDays(c.startDate, c.endDate) : null;
                const dailyRate = days && days > 1 ? c.cost / days : null;
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${PLATFORM_COLORS[c.platform]}`}>
                            {PLATFORM_LABELS[c.platform]}
                          </span>
                          {c.productName && (
                            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{c.productName}</span>
                          )}
                        </div>
                        <p className="font-semibold text-stone-900 text-sm">{c.name}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{c.startDate}{c.endDate && ` — ${c.endDate}`}
                          </span>
                          {days && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days} დღე</span>}
                          {c.notes && <span className="truncate max-w-xs">{c.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-lg font-bold text-amber-600">{formatGEL(c.cost)}</span>
                          {dailyRate && (
                            <p className="text-xs text-stone-400">{formatGEL(dailyRate)}/დღე</p>
                          )}
                        </div>
                        <Form method="post" onSubmit={e => { if (!window.confirm(`"${c.name}" წაიშლება?`)) e.preventDefault(); }}>
                          <input type="hidden" name="_action" value="delete" />
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </Form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
