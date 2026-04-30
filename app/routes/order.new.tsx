import type { Route } from './+types/order.new';
import { Form, Link, redirect, useActionData, useLoaderData, useNavigation } from 'react-router';
import { ArrowLeft, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { getProduct, getSoldQuantity, createOrder } from '~/data/store';
import { formatGEL, SOURCE_LABELS } from '~/types';
import type { SaleSource } from '~/types';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const preselected = url.searchParams.get('productId') ?? '';

  if (!preselected) return redirect('/products');

  const product = await getProduct(preselected);
  if (!product) return redirect('/products');

  const soldQty = await getSoldQuantity(product.id);
  const remaining = product.stock - soldQty;
  if (remaining <= 0) return redirect('/products');

  return { product, soldQty, preselected };
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const productId = fd.get('productId') as string;
  const quantity = parseInt(fd.get('quantity') as string) || 0;
  const pricePerUnit = parseFloat(fd.get('pricePerUnit') as string) || 0;
  const source = fd.get('source') as SaleSource;
  const notes = fd.get('notes') as string;

  const product = await getProduct(productId);
  if (!product) return { error: 'პროდუქტი ვერ მოიძებნა' };

  const soldQty = await getSoldQuantity(productId);
  const remaining = product.stock - soldQty;
  if (quantity <= 0) return { error: 'რაოდენობა უნდა იყოს 0-ზე მეტი' };
  if (quantity > remaining) return { error: `მაქსიმუმ ${remaining} ჩანთა შეგიძლია გაყიდო (${soldQty} უკვე გაყიდული)` };

  await createOrder({
    productId,
    productName: product.name,
    productImage: product.image,
    quantity,
    pricePerUnit,
    totalAmount: quantity * pricePerUnit,
    source,
    notes: notes || '',
  });

  return redirect('/orders');
}

export default function OrderNew() {
  const { product, soldQty } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const remaining = product.stock - soldQty;
  const sources: SaleSource[] = ['facebook', 'instagram', 'tiktok', 'website', 'other'];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ახალი ორდერი</h1>
          <p className="text-stone-500 text-sm mt-0.5">გაყიდვის ჩაწერა</p>
        </div>
      </div>

      <Form method="post" className="space-y-5">
        {actionData?.error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {actionData.error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-5">
          {/* Product display */}
          <input type="hidden" name="productId" value={product.id} />
          <div>
            <p className="text-sm font-medium text-stone-700 mb-1.5">პროდუქტი</p>
            <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3 border border-amber-100">
              {product.image ? (
                <img src={product.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-amber-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-900 text-sm truncate">{product.name}</p>
                <div className="flex gap-3 text-xs text-stone-500 mt-0.5">
                  <span>დარჩა: <strong className="text-amber-800">{remaining}</strong></span>
                  <span>გასაყიდი: <strong>{formatGEL(product.sellingPrice)}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Quantity + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                რაოდენობა <span className="text-red-500">*</span>
              </label>
              <input type="number" name="quantity" min="1" max={remaining} defaultValue="1" required
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600" />
              <p className="text-xs text-stone-400 mt-1">მაქს: {remaining}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                გასაყიდი ფასი/ერთი <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="pricePerUnit"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={product.sellingPrice}
                  className="w-full pr-8 px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₾</span>
              </div>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              გაყიდვის წყარო <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sources.map((src, i) => (
                <label key={src} className="relative flex items-center gap-2 px-3 py-2.5 border border-stone-200 rounded-xl cursor-pointer hover:border-amber-300 has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 transition-colors">
                  <input type="radio" name="source" value={src} defaultChecked={i === 0} required className="sr-only" />
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${src === 'facebook' ? 'bg-blue-500' : src === 'instagram' ? 'bg-purple-500' : src === 'tiktok' ? 'bg-stone-800' : src === 'website' ? 'bg-amber-600' : 'bg-stone-400'}`} />
                  <span className="text-sm text-stone-700 font-medium">{SOURCE_LABELS[src]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">შენიშვნა</label>
            <textarea name="notes" rows={2} placeholder="სურვილისამებრ..."
              className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none placeholder-stone-400" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="submit" disabled={isSubmitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
            <ShoppingCart className="w-4 h-4" />
            {isSubmitting ? 'ინახება...' : 'ორდერის შექმნა'}
          </button>
          <Link to="/products"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
            <ArrowLeft className="w-4 h-4" />გაუქმება
          </Link>
        </div>
      </Form>
    </div>
  );
}
