import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  color: 'violet' | 'emerald' | 'rose' | 'amber';
  sub?: string;
}

const colors = {
  violet: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    valueText: 'text-amber-800',
    border: 'border-amber-100',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    valueText: 'text-emerald-700',
    border: 'border-emerald-100',
  },
  rose: {
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    valueText: 'text-red-700',
    border: 'border-red-100',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    valueText: 'text-amber-700',
    border: 'border-amber-100',
  },
};

export default function StatsCard({ label, value, icon: Icon, color, sub }: StatsCardProps) {
  const c = colors[color];
  return (
    <div className={`bg-white rounded-2xl border ${c.border} border-opacity-60 border-stone-200 p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-500 truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1.5 ${c.valueText} truncate`}>{value}</p>
          {sub && <p className="text-xs text-stone-400 mt-1.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0 ml-3`}>
          <Icon className={`w-6 h-6 ${c.iconText}`} />
        </div>
      </div>
    </div>
  );
}
