import type { Route } from './+types/product.edit';
import { redirect } from 'react-router';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getProduct, updateProduct, getSoldQuantity } from '~/data/store';
import type { ProductStatus } from '~/types';
import ProductForm from '~/components/ProductForm';

export async function loader({ params }: Route.LoaderArgs) {
  const product = await getProduct(params.id);
  if (!product) throw new Response('პროდუქტი ვერ მოიძებნა', { status: 404 });
  return { product };
}

export async function action({ request, params }: Route.ActionArgs) {
  const fd = await request.formData();

  const imageFile = fd.get('image');
  const currentImage = fd.get('currentImage') as string;
  let imageUrl: string | null = currentImage || null;

  if (imageFile instanceof File && imageFile.size > 0) {
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    imageUrl = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
  }

  const newStock = parseInt(fd.get('stock') as string) || 1;
  const soldQty = await getSoldQuantity(params.id);
  const autoStatus: ProductStatus = soldQty >= newStock ? 'sold' : 'available';

  await updateProduct(params.id, {
    name: fd.get('name') as string,
    image: imageUrl,
    costPrice: parseFloat(fd.get('costPrice') as string) || 0,
    sellingPrice: parseFloat(fd.get('sellingPrice') as string) || 0,
    deliveryCost: parseFloat(fd.get('deliveryCost') as string) || 0,
    packagingCost: parseFloat(fd.get('packagingCost') as string) || 0,
    otherExpenses: parseFloat(fd.get('otherExpenses') as string) || 0,
    stock: newStock,
    status: autoStatus,
    weight: parseFloat(fd.get('weight') as string) || undefined,
    sizeHeight: parseFloat(fd.get('sizeHeight') as string) || undefined,
    sizeWidth: parseFloat(fd.get('sizeWidth') as string) || undefined,
    sizeDepth: parseFloat(fd.get('sizeDepth') as string) || undefined,
  });

  return redirect('/products');
}

export default function ProductEdit({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/products" className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ჩანთის რედაქტირება</h1>
          <p className="text-stone-500 text-sm mt-0.5 truncate max-w-xs">{product.name}</p>
        </div>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
