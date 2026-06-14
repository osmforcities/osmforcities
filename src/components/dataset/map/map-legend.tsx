import type { MapTheme } from '@/lib/map-themes';
import { buildLegend } from '@/lib/map-themes';

interface MapLegendProps {
  theme: MapTheme;
  title?: string;
}

export function MapLegend({ theme, title }: MapLegendProps) {
  const legend = buildLegend(theme);

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm" style={{ maxWidth: '280px' }}>
      {title && (
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          {title}
        </h4>
      )}
      <div className="space-y-1.5">
        {legend.items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm border"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-700">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
