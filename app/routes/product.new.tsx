import type { Route } from './+types/product.new';
import { redirect } from 'react-router';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { createProduct } from '~/data/store';
import type { ProductStatus } from '~/types';
import ProductForm from '~/components/ProductForm';

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();

  const imageFile = fd.get('image');
  const currentImage = fd.get('currentImage') as string;
  let imageUrl: string | null = currentImage || null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    imageUrl = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
  }

  await createProduct({
    name: fd.get('name') as string,
    image: imageUrl,
    costPrice: parseFloat(fd.get('costPrice') as string) || 0,
    sellingPrice: parseFloat(fd.get('sellingPrice') as string) || 0,
    deliveryCost: parseFloat(fd.get('deliveryCost') as string) || 0,
    packagingCost: parseFloat(fd.get('packagingCost') as string) || 0,
    otherExpenses: parseFloat(fd.get('otherExpenses') as string) || 0,
    stock: parseInt(fd.get('stock') as string) || 1,
    status: (fd.get('status') as ProductStatus) || 'available',
    weight: parseFloat(fd.get('weight') as string) || undefined,
    sizeHeight: parseFloat(fd.get('sizeHeight') as string) || undefined,
    sizeWidth: parseFloat(fd.get('sizeWidth') as string) || undefined,
    sizeDepth: parseFloat(fd.get('sizeDepth') as string) || undefined,
  });

  return redirect('/products');
}

export default function ProductNew() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ახალი ჩანთა</h1>
          <p className="text-stone-500 text-sm mt-0.5">ახალი პროდუქტის დამატება</p>
        </div>
      </div>
      <ProductForm />
    </div>
  );
}
