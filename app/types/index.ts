export type ProductStatus = 'available' | 'sold';
export type SaleSource = 'facebook' | 'instagram' | 'tiktok' | 'website' | 'other';
export type AdPlatform = 'facebook' | 'instagram' | 'tiktok' | 'website' | 'other';

export interface Product {
  id: string;
  name: string;
  image: string | null;
  costPrice: number;
  sellingPrice: number;
  deliveryCost: number;
  packagingCost: number;
  otherExpenses: number;
  stock: number;
  status: ProductStatus;
  weight?: number;      // გრამი
  sizeHeight?: number;  // სმ
  sizeWidth?: number;   // სმ
  sizeDepth?: number;   // სმ
  createdAt: string;
}

export interface Order {
  id: string;
  orderCode: string;
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  source: SaleSource;
  notes: string;
  createdAt: string;
}

export interface AdCampaign {
  id: string;
  name: string;
  platform: AdPlatform;
  cost: number;
  productId: string;
  productName: string;
  startDate: string;
  endDate: string;
  notes: string;
  createdAt: string;
}

export function getTotalExpensesPerUnit(p: Product): number {
  return p.costPrice + p.deliveryCost + p.packagingCost + p.otherExpenses;
}

export function getVariableCostPerUnit(p: Product): number {
  return p.deliveryCost + p.packagingCost + p.otherExpenses;
}

export function getProfitPerUnit(p: Product): number {
  return p.sellingPrice - getTotalExpensesPerUnit(p);
}

export function calcAdDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

export function formatGEL(amount: number): string {
  return `${amount.toFixed(2)} ₾`;
}

export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('ka-GE', { year: 'numeric', month: 'long' });
}

export function formatSize(p: Product): string | null {
  if (!p.sizeHeight && !p.sizeWidth && !p.sizeDepth) return null;
  return `${p.sizeHeight ?? '?'}×${p.sizeWidth ?? '?'}×${p.sizeDepth ?? '?'} სმ`;
}

export const SOURCE_LABELS: Record<SaleSource, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'ვებსაიტი',
  other: 'სხვა',
};

export const SOURCE_COLORS: Record<SaleSource, string> = {
  facebook: 'bg-blue-100 text-blue-700',
  instagram: 'bg-orange-100 text-orange-700',
  tiktok: 'bg-stone-800 text-stone-100',
  website: 'bg-amber-100 text-amber-700',
  other: 'bg-stone-100 text-stone-600',
};

export const PLATFORM_LABELS = SOURCE_LABELS as Record<AdPlatform, string>;
export const PLATFORM_COLORS = SOURCE_COLORS as Record<AdPlatform, string>;
