'use client';

import React from 'react';
import { Calendar, ShoppingBag, Activity, Store, Sun, Moon, Users } from 'lucide-react';

interface HeaderProps {
  activeTab: 'planner' | 'grocery' | 'prices' | 'tracker';
  setActiveTab: (tab: 'planner' | 'grocery' | 'prices' | 'tracker') => void;
  groceryCount: number;
  coupleModeEnabled: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  groceryCount,
  coupleModeEnabled,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 border-b ${
        isDark
          ? 'bg-[#0B0C0E]/75 border-white/[0.08] text-white shadow-2xl shadow-black/40'
          : 'bg-[#F7F5F0]/80 border-stone-200/80 text-stone-900 shadow-sm'
      } backdrop-blur-2xl`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Logo & Titre - Typo Éditoriale Nordic */}
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/15 shadow-inner'
                  : 'bg-stone-900 text-stone-50 shadow-md'
              }`}
            >
              <span className="font-serif italic font-semibold text-lg">fp</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-tight text-xl font-normal">
                  FoodPlanner <span className="italic font-light text-stone-400">QC</span>
                </span>
                <span
                  className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border ${
                    isDark
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      : 'bg-emerald-950/5 text-emerald-800 border-emerald-800/15'
                  }`}
                >
                  Metro
                </span>
                {coupleModeEnabled && (
                  <span
                    className={`text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      isDark
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'bg-purple-50 text-purple-800 border-purple-200'
                    }`}
                  >
                    <Users className="w-2.5 h-2.5" /> Couple
                  </span>
                )}
              </div>
              <p
                className={`text-[11px] tracking-wide hidden sm:block ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                Prise de masse athlétique • Repas du soir doublés • Metro Québec
              </p>
            </div>
          </div>

          {/* Anneau / Pill Macros Style Apple Fitness */}
          <div
            className={`hidden lg:flex items-center gap-3 px-3.5 py-1.5 rounded-full border transition-all ${
              isDark
                ? 'bg-white/[0.03] border-white/10 text-stone-200'
                : 'bg-stone-100/70 border-stone-200 text-stone-800'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
              <span className={isDark ? 'text-stone-400' : 'text-stone-500'}>Cible :</span>
              <span className="font-semibold">3 050 kcal</span>
            </div>
            <div className={`h-3 w-[1px] ${isDark ? 'bg-white/10' : 'bg-stone-300'}`} />
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              <span className={isDark ? 'text-stone-400' : 'text-stone-500'}>Protéines :</span>
              <span className="font-semibold">165 g</span>
            </div>
          </div>

          {/* Navigation & Theme Toggle */}
          <div className="flex items-center gap-2">
            {/* Nav Pill Liquid Glass */}
            <nav
              className={`flex items-center p-1 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-stone-200/60 border-stone-300/60'
              }`}
            >
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'planner'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Semaine</span>
              </button>

              <button
                onClick={() => setActiveTab('grocery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'grocery'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Épicerie</span>
                {groceryCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      activeTab === 'grocery'
                        ? isDark
                          ? 'bg-stone-950 text-white'
                          : 'bg-stone-50 text-stone-900'
                        : isDark
                        ? 'bg-white/10 text-stone-300'
                        : 'bg-stone-300/80 text-stone-700'
                    }`}
                  >
                    {groceryCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'tracker'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Tracker</span>
              </button>

              <button
                onClick={() => setActiveTab('prices')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'prices'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Circulaires</span>
              </button>
            </nav>

            {/* Toggle Mode Jour / Nuit */}
            <button
              onClick={onToggleTheme}
              aria-label="Basculer le thème Jour/Nuit"
              className={`p-2 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-amber-300'
                  : 'bg-white hover:bg-stone-100 border-stone-200 text-stone-700 shadow-sm'
              }`}
              title={isDark ? 'Activer le mode Jour (Nordic Cream)' : 'Activer le mode Nuit (Obsidian Glass)'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
