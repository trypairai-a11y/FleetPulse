"use client";
import { X } from "lucide-react";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function SlidePanel({ open, onClose, title, subtitle, children }: SlidePanelProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full shadow-lg overflow-y-auto p-6 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            {subtitle && <span className="text-xs text-secondary">{subtitle}</span>}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-50 rounded-lg">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
