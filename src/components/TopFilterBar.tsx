import type { WaterType } from "@/types";
import { WATER_TYPE_LABELS } from "@/types";

interface TopFilterBarProps {
  activeWaterType: WaterType;
  onWaterTypeChange: (type: WaterType) => void;
}

export function TopFilterBar({ activeWaterType, onWaterTypeChange }: TopFilterBarProps) {
  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
      <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border rounded-full p-1 shadow-lg">
        {(["ponds", "river", "lake"] as const).map((type) => (
          <button
            key={type}
            onClick={() => onWaterTypeChange(type)}
            className={`px-4 md:px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              activeWaterType === type
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {WATER_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
