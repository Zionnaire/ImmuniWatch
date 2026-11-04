import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label:    string;
  value:    string | number;
  sub?:     string;
  icon?:    LucideIcon;
  trend?:   { value: number; label: string };
  color?:   'teal' | 'peach' | 'mauve' | 'ocean' | 'red' | 'yellow' | 'blue' | 'indigo' | 'green' | 'emerald';
  accent?:  string; // override icon bg color directly
}

const ICON_STYLE: Record<string, { bg: string; color: string }> = {
  teal:    { bg: 'rgba(0,137,123,0.12)',  color: '#00897b' },
  peach:   { bg: 'rgba(244,162,97,0.15)', color: '#c25b0a' },
  mauve:   { bg: 'rgba(176,139,191,0.15)',color: '#7b4ea0' },
  ocean:   { bg: 'rgba(91,164,207,0.15)', color: '#1a6fa0' },
  red:     { bg: 'rgba(192,57,43,0.10)',  color: '#c0392b' },
  yellow:  { bg: 'rgba(217,119,6,0.12)',  color: '#d97706' },
  blue:    { bg: 'rgba(37,99,235,0.10)',  color: '#2563eb' },
  indigo:  { bg: 'rgba(0,137,123,0.12)',  color: '#00897b' },
  green:   { bg: 'rgba(0,137,123,0.12)',  color: '#00897b' },
  emerald: { bg: 'rgba(0,137,123,0.12)',  color: '#00897b' },
};

export function StatCard({ label, value, sub, icon: Icon, trend, color = 'teal', accent }: StatCardProps) {
  const style = ICON_STYLE[color] ?? ICON_STYLE.teal;

  return (
    <div className="stat-tile group">
      {Icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-105"
          style={{ background: accent ? `${accent}20` : style.bg }}
        >
          <Icon style={{ width: '18px', height: '18px', color: accent ?? style.color }} />
        </div>
      )}
      <p className="label-caps text-[#4a6060] truncate mb-1">{label}</p>
      <p className="text-[1.625rem] font-bold leading-none num-display" style={{ color: '#0f2626' }}>{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-[#4a6060]">{sub}</p>}
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${trend.value >= 0 ? 'text-[#059669]' : 'text-[#c0392b]'}`}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  );
}
