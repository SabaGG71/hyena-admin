import { Link, useFetcher } from 'react-router';
import { Edit2, Trash2, ShoppingBag, TrendingUp, TrendingDown, ShoppingCart, ToggleLeft, Scale, Ruler } from 'lucide-react';
import type { Product } from '~/types';
import { getProfitPerUnit, formatGEL, formatSize } from '~/types';
import Badge from './Badge';

interface ProductCardProps {
  product: Product;
  soldQty: number;
}

export default function ProductCard({ product, soldQty }: ProductCardProps) {
  const deleteFetcher = useFetcher();
  const statusFetcher = useFetcher();
  const profit = getProfitPerUnit(product);
  const remaining = product.stock - soldQty;
  const isDeleting = deleteFetcher.state !== 'idle';

  function handleDelete(e: React.FormEvent) {
    if (!window.confirm(`"${product.name}" წაიშლება. გაგრძელება?`)) e.preventDefault();
  }

  return (
    <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* Image */}
      <div className="relative h-44 bg-stone-100 overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-300">
            <ShoppingBag className="w-10 h-10 mb-1" />
            <span className="text-xs">ფოტო არ არის</span>
          </div>
        )}
        <div className="absolute top-2.5 right-2.5">
          <Badge variant={product.status === 'sold' ? 'sold' : 'available'}>
            {product.status === 'sold' ? 'გაყიდულია' : 'ხელმისაწვდომია'}
          </Badge>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        <h3 className="font-semibold text-stone-900 text-sm leading-tight line-clamp-2">{product.name}</h3>

        {/* Stock bar */}
        <div className="bg-stone-50 rounded-xl p-3">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-stone-500">სტოკი</span>
            <span className="font-semibold text-stone-700">{soldQty}/{product.stock} გაყიდული</span>
          </div>
          <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${remaining === 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${product.stock > 0 ? (soldQty / product.stock) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className={`font-semibold ${remaining === 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {remaining} დარჩა
            </span>
            <span className="text-stone-400">{product.stock} სულ</span>
          </div>
        </div>

        {/* Size & Weight */}
        {(product.weight || product.sizeWidth) && (
          <div className="flex items-center gap-3 text-xs text-stone-400">
            {product.weight && (
              <span className="flex items-center gap-1">
                <Scale className="w-3 h-3" />{product.weight}გ
              </span>
            )}
            {formatSize(product) && (
              <span className="flex items-center gap-1">
                <Ruler className="w-3 h-3" />{formatSize(product)}
              </span>
            )}
          </div>
        )}

        {/* Prices */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-stone-50 rounded-xl p-2.5">
            <p className="text-xs text-stone-400 mb-0.5">ღირებულება</p>
            <p className="text-sm font-bold text-stone-700">{formatGEL(product.costPrice)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-2.5">
            <p className="text-xs text-stone-400 mb-0.5">გასაყიდი</p>
            <p className="text-sm font-bold text-stone-700">{formatGEL(product.sellingPrice)}</p>
          </div>
        </div>

        {/* Profit per unit */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          {profit >= 0
            ? <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            : <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <span className="text-xs text-stone-500">მოგება/ერთი:</span>
          <span className={`text-sm font-bold ml-auto ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {profit >= 0 ? '+' : ''}{formatGEL(profit)}
          </span>
        </div>

        {/* ──────────── Actions ──────────── */}
        <div className="flex flex-col gap-2 pt-1 border-t border-stone-100">

          {/* Primary: Sell (→ order form) OR mark available back */}
          {product.status === 'available' && remaining > 0 ? (
            <Link
              to={`/orders/new?productId=${product.id}`}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              გაყიდვა / ორდერი
            </Link>
          ) : product.status === 'sold' ? (
            /* Toggle back to available */
            <statusFetcher.Form method="post" action="/products">
              <input type="hidden" name="_action" value="toggleStatus" />
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="status" value="available" />
              <button type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-amber-800 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors border border-amber-200">
                <ToggleLeft className="w-4 h-4" />
                ხელმისაწვდომიად მონიშვნა
              </button>
            </statusFetcher.Form>
          ) : (
            /* Out of stock but not manually sold */
            <span className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-stone-400 bg-stone-100 rounded-xl cursor-not-allowed">
              სტოკი ამოიწურა
            </span>
          )}

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`/products/${product.id}/edit`}
              className="flex items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              რედაქტირება
            </Link>

            <deleteFetcher.Form method="post" action="/products" onSubmit={handleDelete}>
              <input type="hidden" name="_action" value="delete" />
              <input type="hidden" name="id" value={product.id} />
              <button type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                წაშლა
              </button>
            </deleteFetcher.Form>
          </div>
        </div>
      </div>
    </div>
  );
}
