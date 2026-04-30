import type { Route } from './+types/products';
import { Link, useSearchParams } from 'react-router';
import { Plus, Search, ShoppingBag, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { getProducts, deleteProduct, updateProduct, getSoldQuantities } from '~/data/store';
import ProductCard from '~/components/ProductCard';

const PAGE_SIZE = 12;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const status = url.searchParams.get('status') ?? 'all';
  const weight = url.searchParams.get('weight') ?? 'all';
  const size = url.searchParams.get('size') ?? 'all';
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));

  const allProducts = await getProducts();

  const counts = {
    all: allProducts.length,
    available: allProducts.filter(p => p.status === 'available').length,
    sold: allProducts.filter(p => p.status === 'sold').length,
  };

  let products = allProducts;
  if (q) {
    const lower = q.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(lower));
  }
  if (status === 'available' || status === 'sold') {
    products = products.filter(p => p.status === status);
  }
  if (weight === 'light') products = products.filter(p => p.weight !== undefined && p.weight < 500);
  if (weight === 'medium') products = products.filter(p => p.weight !== undefined && p.weight >= 500 && p.weight <= 1000);
  if (weight === 'heavy') products = products.filter(p => p.weight !== undefined && p.weight > 1000);
  if (size === 'mini') products = products.filter(p => p.sizeWidth !== undefined && p.sizeWidth < 15);
  if (size === 'medium') products = products.filter(p => p.sizeWidth !== undefined && p.sizeWidth >= 15 && p.sizeWidth <= 25);
  if (size === 'large') products = products.filter(p => p.sizeWidth !== undefined && p.sizeWidth > 25);

  products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalCount = products.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const soldQtyMap = await getSoldQuantities(paginated.map(p => p.id));

  return { products: paginated, soldQtyMap, q, status, weight, size, page: safePage, totalPages, totalCount, counts };
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const act = fd.get('_action') as string;
  if (act === 'delete') await deleteProduct(fd.get('id') as string);
  if (act === 'toggleStatus') await updateProduct(fd.get('id') as string, { status: fd.get('status') as 'available' | 'sold' });
  return null;
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { products, soldQtyMap, q, status, weight, size, page, totalPages, totalCount, counts } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  function setParam(key: string, val: string, resetPage = true) {
    const p = new URLSearchParams(searchParams);
    val === 'all' || val === '' ? p.delete(key) : p.set(key, val);
    if (resetPage) p.delete('page');
    setSearchParams(p, { replace: true });
  }

  const statusTabs = [
    { key: 'all', label: 'ყველა', count: counts.all },
    { key: 'available', label: 'ხელმისაწვდომი', count: counts.available },
    { key: 'sold', label: 'გაყიდული', count: counts.sold },
  ];

  const weightOpts = [
    { key: 'all', label: 'ყველა წონა' },
    { key: 'light', label: '< 500გ' },
    { key: 'medium', label: '500–1000გ' },
    { key: 'heavy', label: '> 1000გ' },
  ];

  const sizeOpts = [
    { key: 'all', label: 'ყველა ზომა' },
    { key: 'mini', label: 'მინი (< 15სმ)' },
    { key: 'medium', label: 'საშუალო (15–25სმ)' },
    { key: 'large', label: 'დიდი (> 25სმ)' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">პროდუქტები</h1>
          <p className="text-stone-500 text-sm mt-0.5">ჩანთების მართვა</p>
        </div>
        <Link to="/products/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />ახალი ჩანთა
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          <input key={q} type="text" placeholder="ჩანთის ძებნა სახელით..."
            defaultValue={q} onChange={e => setParam('q', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 bg-stone-50" />
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-4 h-4 text-stone-400 flex-shrink-0" />
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setParam('status', tab.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border ${status === tab.key ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${status === tab.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* Weight + Size filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500">წონა:</span>
            <div className="flex gap-1">
              {weightOpts.map(opt => (
                <button key={opt.key} onClick={() => setParam('weight', opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${weight === opt.key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-stone-500">ზომა:</span>
            <div className="flex gap-1">
              {sizeOpts.map(opt => (
                <button key={opt.key} onClick={() => setParam('size', opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${size === opt.key ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <ShoppingBag className="w-14 h-14 text-stone-200 mx-auto mb-4" />
          <p className="text-stone-600 font-semibold text-lg">პროდუქტი ვერ მოიძებნა</p>
          <p className="text-stone-400 text-sm mt-1.5 mb-5">{q ? `"${q}" სახელით ჩანთა არ არსებობს` : 'ამ ფილტრით ჩანთა ვერ მოიძებნა'}</p>
          <Link to="/products/new" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors">
            <Plus className="w-4 h-4" />ახალი ჩანთის დამატება
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-500">{totalCount} ჩანთა · გვ. {page}/{totalPages}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} soldQty={soldQtyMap[product.id] ?? 0} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setParam('page', String(page - 1), false)}
                disabled={page === 1}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setParam('page', String(p), false)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${p === page ? 'bg-amber-700 text-white' : 'border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                  {p}
                </button>
              ))}
              <button
                onClick={() => setParam('page', String(page + 1), false)}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
