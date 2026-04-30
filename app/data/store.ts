import { prisma } from '~/lib/prisma.server';
import type { Product, Order, AdCampaign, ProductStatus, SaleSource, AdPlatform } from '~/types';

type PrismaProduct = {
  id: string; name: string; image: string | null; costPrice: number; sellingPrice: number;
  deliveryCost: number; packagingCost: number; otherExpenses: number; stock: number;
  status: string; weight: number | null; sizeHeight: number | null; sizeWidth: number | null;
  sizeDepth: number | null; createdAt: Date;
};
type PrismaOrder = {
  id: string; orderCode: string; productId: string; productName: string;
  productImage: string | null; quantity: number; pricePerUnit: number; totalAmount: number;
  source: string; notes: string; createdAt: Date;
};
type PrismaCampaign = {
  id: string; name: string; platform: string; cost: number; productId: string;
  productName: string; startDate: string; endDate: string; notes: string; createdAt: Date;
};

function mapProduct(p: PrismaProduct): Product {
  return {
    ...p,
    status: p.status as ProductStatus,
    weight: p.weight ?? undefined,
    sizeHeight: p.sizeHeight ?? undefined,
    sizeWidth: p.sizeWidth ?? undefined,
    sizeDepth: p.sizeDepth ?? undefined,
    createdAt: p.createdAt.toISOString(),
  };
}

function mapOrder(o: PrismaOrder): Order {
  return { ...o, source: o.source as SaleSource, createdAt: o.createdAt.toISOString() };
}

function mapCampaign(c: PrismaCampaign): AdCampaign {
  return { ...c, platform: c.platform as AdPlatform, createdAt: c.createdAt.toISOString() };
}

// ── Products ─────────────────────────────────────────────
export async function getProducts(): Promise<Product[]> {
  const rows = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapProduct);
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const row = await prisma.product.findUnique({ where: { id } });
  return row ? mapProduct(row) : undefined;
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> {
  const row = await prisma.product.create({
    data: {
      id: crypto.randomUUID(),
      name: data.name,
      image: data.image,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      deliveryCost: data.deliveryCost,
      packagingCost: data.packagingCost,
      otherExpenses: data.otherExpenses,
      stock: data.stock,
      status: data.status,
      weight: data.weight ?? null,
      sizeHeight: data.sizeHeight ?? null,
      sizeWidth: data.sizeWidth ?? null,
      sizeDepth: data.sizeDepth ?? null,
    },
  });
  return mapProduct(row);
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt'>>,
): Promise<Product | null> {
  try {
    const row = await prisma.product.update({
      where: { id },
      data: {
        name: data.name,
        image: data.image,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        deliveryCost: data.deliveryCost,
        packagingCost: data.packagingCost,
        otherExpenses: data.otherExpenses,
        stock: data.stock,
        status: data.status,
        weight: 'weight' in data ? (data.weight ?? null) : undefined,
        sizeHeight: 'sizeHeight' in data ? (data.sizeHeight ?? null) : undefined,
        sizeWidth: 'sizeWidth' in data ? (data.sizeWidth ?? null) : undefined,
        sizeDepth: 'sizeDepth' in data ? (data.sizeDepth ?? null) : undefined,
      },
    });
    return mapProduct(row);
  } catch {
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await prisma.product.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ── Orders ────────────────────────────────────────────────
export async function getOrders(): Promise<Order[]> {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapOrder);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? mapOrder(row) : undefined;
}

export async function getSoldQuantity(productId: string): Promise<number> {
  const result = await prisma.order.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

export async function getSoldQuantities(productIds: string[]): Promise<Record<string, number>> {
  const results = await prisma.order.groupBy({
    by: ['productId'],
    where: { productId: { in: productIds } },
    _sum: { quantity: true },
  });
  const map: Record<string, number> = Object.fromEntries(productIds.map(id => [id, 0]));
  for (const r of results) map[r.productId] = r._sum.quantity ?? 0;
  return map;
}

export async function createOrder(data: Omit<Order, 'id' | 'orderCode' | 'createdAt'>): Promise<Order> {
  const uuid = crypto.randomUUID();
  const row = await prisma.order.create({
    data: { ...data, id: uuid, orderCode: `ORD-${uuid.substring(0, 8)}` },
  });

  const sold = await getSoldQuantity(data.productId);
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (product && sold >= product.stock) {
    await prisma.product.update({ where: { id: data.productId }, data: { status: 'sold' } });
  }

  return mapOrder(row);
}

export async function deleteOrder(id: string): Promise<boolean> {
  const row = await prisma.order.findUnique({ where: { id } });
  if (!row) return false;

  await prisma.order.delete({ where: { id } });

  const product = await prisma.product.findUnique({ where: { id: row.productId } });
  if (product && product.status === 'sold') {
    const sold = await getSoldQuantity(row.productId);
    if (sold < product.stock) {
      await prisma.product.update({ where: { id: row.productId }, data: { status: 'available' } });
    }
  }

  return true;
}

// ── Ad Campaigns ──────────────────────────────────────────
export async function getAdCampaigns(): Promise<AdCampaign[]> {
  const rows = await prisma.adCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(mapCampaign);
}

export async function createAdCampaign(data: Omit<AdCampaign, 'id' | 'createdAt'>): Promise<AdCampaign> {
  const row = await prisma.adCampaign.create({
    data: { ...data, id: crypto.randomUUID() },
  });
  return mapCampaign(row);
}

export async function deleteAdCampaign(id: string): Promise<boolean> {
  try {
    await prisma.adCampaign.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
