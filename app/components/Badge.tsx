type Variant = 'sold' | 'available' | 'profit' | 'loss';

interface BadgeProps {
  children: React.ReactNode;
  variant: Variant;
}

const variants: Record<Variant, string> = {
  sold: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  available: 'bg-amber-100 text-amber-700 border border-amber-200',
  profit: 'bg-amber-100 text-amber-800 border border-amber-200',
  loss: 'bg-red-100 text-red-700 border border-red-200',
};

export default function Badge({ children, variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${variants[variant]}`}>
      {children}
    </span>
  );
}
