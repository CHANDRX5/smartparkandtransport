import React from 'react';
import { Shield, Sparkles, Navigation } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-navy-950 font-display">SmartPark AI</span>
          <span>&copy; {new Date().getFullYear()} — Intelligent Parking & Vehicle Recovery Platform</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-slate-600">
            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
            AI Availability Engine
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <Navigation className="w-3.5 h-3.5 text-emerald-500" />
            OSRM Geo Routing
          </span>
          <span className="flex items-center gap-1 text-slate-600">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            Rule-Based Match Engine
          </span>
        </div>
      </div>
    </footer>
  );
};
