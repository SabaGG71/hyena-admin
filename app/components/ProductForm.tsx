import { useState } from 'react';
import { Form, Link, useNavigation } from 'react-router';
import { Upload, X, ShoppingBag, TrendingUp, TrendingDown, Calculator, ArrowLeft, Save, Package, Ruler, Scale } from 'lucide-react';
import type { Product } from '~/types';
import { formatGEL } from '~/types';

interface ProductFormProps {
  product?: Product;
  error?: string;
}

function NumField({ label, name, value, onChange, hint, required }: {
  label: string; name: string; value: number;
  onChange: (v: number) => void; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="number" name={name}
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          min="0" step="0.01" placeholder="0.00" required={required}
          className="w-full pr-8 pl-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">₾</span>
      </div>
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function ProductForm({ product, error }: ProductFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [imagePreview, setImagePreview] = useState<string | null>(product?.image ?? null);
  const [fields, setFields] = useState({
    costPrice: product?.costPrice ?? 0,
    sellingPrice: product?.sellingPrice ?? 0,
    deliveryCost: product?.deliveryCost ?? 0,
    packagingCost: product?.packagingCost ?? 0,
    otherExpenses: product?.otherExpenses ?? 0,
  });

  const set = (k: keyof typeof fields) => (v: number) =>
    setFields(prev => ({ ...prev, [k]: v }));

  const totalExpenses = fields.costPrice + fields.deliveryCost + fields.packagingCost + fields.otherExpenses;
  const profit = fields.sellingPrice - totalExpenses;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <Form method="post" encType="multipart/form-data" className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image + calculator */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-600" />ჩანთის ფოტო
            </h3>
            <div className="relative rounded-xl overflow-hidden bg-stone-100 aspect-square">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => { setImagePreview(null); (document.getElementById('img-input') as HTMLInputElement).value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
                  ><X className="w-4 h-4" /></button>
                </>
              ) : (
                <label htmlFor="img-input" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-200 transition-colors">
                  <ShoppingBag className="w-10 h-10 text-stone-300 mb-2" />
                  <span className="text-xs text-stone-400 font-medium">ფოტოს ატვირთვა</span>
                </label>
              )}
            </div>
            <input id="img-input" type="file" name="image" accept="image/*" onChange={handleImageChange} className="hidden" />
            <input type="hidden" name="currentImage" value={product?.image ?? ''} />
            {!imagePreview && (
              <label htmlFor="img-input" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-stone-300 rounded-xl text-sm text-stone-500 hover:border-amber-500 hover:text-amber-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />ფოტოს არჩევა
              </label>
            )}
          </div>

          {/* Profit calculator */}
          <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-600" />მოგების გამოთვლა
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">სულ ხარჯი</span><span className="font-semibold text-red-600">{formatGEL(totalExpenses)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">გასაყიდი ფასი</span><span className="font-semibold text-emerald-600">{formatGEL(fields.sellingPrice)}</span></div>
              <div className="h-px bg-stone-100 my-1" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-stone-700">მოგება/ერთი</span>
                <div className="flex items-center gap-1.5">
                  {profit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                  <span className={`text-base font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}{formatGEL(profit)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Fields */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />ძირითადი ინფორმაცია
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ჩანთის სახელი <span className="text-red-500">*</span></label>
                <input type="text" name="name" defaultValue={product?.name ?? ''} required placeholder="მაგ: შავი ტყავის ჩანთა"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent placeholder-stone-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">სტოკის რაოდენობა <span className="text-red-500">*</span></label>
                <input type="number" name="stock" defaultValue={product?.stock ?? 1} min="0" required
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent" />
                <p className="text-xs text-stone-400 mt-1">რამდენი ჩანთა ჩამოვიდა</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">სტატუსი</label>
                <select name="status" defaultValue={product?.status ?? 'available'}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent bg-white">
                  <option value="available">ხელმისაწვდომია</option>
                  <option value="sold">გაყიდულია</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-4">ფასები</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <NumField label="ღირებულება (შესყიდვის ფასი)" name="costPrice" value={fields.costPrice} onChange={set('costPrice')} hint="ერთი ჩანთის ღირებულება" required />
              <NumField label="გასაყიდი ფასი" name="sellingPrice" value={fields.sellingPrice} onChange={set('sellingPrice')} hint="გასაყიდი ფასი ერთზე" required />
            </div>
          </div>

          {/* Additional costs */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-1">დამატებითი ხარჯები</h3>
            <p className="text-xs text-stone-400 mb-4">რეკლამის ხარჯები ცალკე ემატება "რეკლამა" გვერდიდან</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <NumField label="მიტანის ხარჯი" name="deliveryCost" value={fields.deliveryCost} onChange={set('deliveryCost')} hint="ერთი ჩანთაზე" />
              <NumField label="შეფუთვის ხარჯი" name="packagingCost" value={fields.packagingCost} onChange={set('packagingCost')} hint="ერთი ჩანთაზე" />
              <NumField label="სხვა ხარჯები" name="otherExpenses" value={fields.otherExpenses} onChange={set('otherExpenses')} hint="ერთი ჩანთაზე" />
            </div>
          </div>

          {/* Physical properties */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-amber-600" />ფიზიკური მახასიათებლები
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-stone-400" />წონა (გრამი)
                </label>
                <input type="number" name="weight" defaultValue={product?.weight ?? ''} min="0" placeholder="მაგ: 800"
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent placeholder-stone-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ზომა (სიმაღლე × სიგანე × სიღრმე, სმ)</label>
                <div className="grid grid-cols-3 gap-2">
                  {([['sizeHeight', product?.sizeHeight], ['sizeWidth', product?.sizeWidth], ['sizeDepth', product?.sizeDepth]] as [string, number | undefined][]).map(([field, val], i) => (
                    <input key={field} type="number" name={field}
                      defaultValue={val ?? ''}
                      min="0" placeholder={['სმ', 'სმ', 'სმ'][i]}
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent placeholder-stone-400 text-center"
                    />
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-1">სიმაღლე × სიგანე × სიღრმე სანტიმეტრებში</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button type="submit" disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-amber-700 text-white rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-60 transition-colors shadow-sm">
          <Save className="w-4 h-4" />{isSubmitting ? 'ინახება...' : 'შენახვა'}
        </button>
        <Link to="/products"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />გაუქმება
        </Link>
      </div>
    </Form>
  );
}
