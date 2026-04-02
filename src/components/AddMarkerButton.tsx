import { Plus } from "lucide-react";

interface AddMarkerButtonProps {
  onClick: () => void;
}

export function AddMarkerButton({ onClick }: AddMarkerButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-30 p-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 text-white"
      aria-label="Add marker"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
