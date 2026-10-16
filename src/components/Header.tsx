'use client';

import React from 'react';
import { Flame, Dumbbell, ShoppingBag, Calendar, Store, Activity, Users } from 'lucide-react';

interface HeaderProps {
  activeTab: 'planner' | 'grocery' | 'prices' | 'tracker';
  setActiveTab: (tab: 'planner' | 'grocery' | 'prices' | 'tracker') => void;
  groceryCount: number;
  coupleModeEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  groceryCount,
  coupleModeEnabled,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Titre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Dumbbell className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  FoodPlanner QC
                </span>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Metro
                </span>
                {coupleModeEnabled && (
                  <span className="text-xs bg-purple-500/20 text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Couple
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {coupleModeEnabled ? 'Ethan (Sportif) & Copine • Split équitable' : 'Prise de masse (75kg / 175cm) • Cuisiner le soir'}
              </p>
            </div>
          </div>

          {/* Profil & Macros Badge */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <div>
                <span className="text-slate-400">Ethan: </span>
                <span className="font-semibold text-amber-300">~3 050 kcal</span>
              </div>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-slate-400">Protéines: </span>
                <span className="font-semibold text-emerald-300">~165 g</span>
              </div>
            </div>
          </div>

          {/* Navigation Onglets */}
          <nav className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'planner'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden xs:inline">Semaine</span>
            </button>

            <button
              onClick={() => setActiveTab('grocery')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'grocery'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Épicerie</span>
              {groceryCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'grocery' ? 'bg-slate-950 text-emerald-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {groceryCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'tracker'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Tracker</span>
            </button>

            <button
              onClick={() => setActiveTab('prices')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'prices'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Circulaires</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
