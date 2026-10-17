'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, 
  ShoppingBag, 
  Activity, 
  Store, 
  Sun, 
  Moon, 
  Users, 
  SlidersHorizontal,
  ChevronDown,
  User,
  Check,
  Plus,
  Pencil,
  X,
  ChefHat,
  Flame,
  Dumbbell,
  Wheat,
  Droplet
} from 'lucide-react';
import { UserCustomizationSettings, UserAccount, DEFAULT_ACCOUNTS } from '@/types';

interface HeaderProps {
  activeTab: 'planner' | 'recipes' | 'grocery' | 'prices' | 'tracker' | 'preferences';
  setActiveTab: (tab: 'planner' | 'recipes' | 'grocery' | 'prices' | 'tracker' | 'preferences') => void;
  groceryCount: number;
  coupleModeEnabled: boolean;
  userSettings?: UserCustomizationSettings;
  accounts?: UserAccount[];
  activeAccountId?: string;
  onSwitchAccount?: (accountId: string) => void;
  onRenameAccount?: (accountId: string, newName: string) => void;
  onCreateAccount?: (name: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  groceryCount,
  coupleModeEnabled,
  userSettings,
  accounts = DEFAULT_ACCOUNTS,
  activeAccountId = 'ethan',
  onSwitchAccount,
  onRenameAccount,
  onCreateAccount,
  theme,
  onToggleTheme,
}) => {
  const isDark = theme === 'dark';
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tempName, setTempName] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0] || DEFAULT_ACCOUNTS[0];

  // Fermer le menu lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenRename = () => {
    setTempName(activeAccount.name);
    setIsRenameModalOpen(true);
    setIsAccountMenuOpen(false);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim() && onRenameAccount) {
      onRenameAccount(activeAccount.id, tempName.trim());
    }
    setIsRenameModalOpen(false);
  };

  const handleOpenCreate = () => {
    setTempName('');
    setIsCreateModalOpen(true);
    setIsAccountMenuOpen(false);
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim() && onCreateAccount) {
      onCreateAccount(tempName.trim());
    }
    setIsCreateModalOpen(false);
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 border-b ${
        isDark
          ? 'bg-[#0B0C0E]/95 border-white/[0.08] text-white shadow-2xl shadow-black/40'
          : 'bg-white/95 border-stone-200/90 text-stone-900 shadow-xs'
      } backdrop-blur-md`}
    >
      <div className="max-w-[1536px] w-full mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-2 sm:gap-4 min-w-0">
          {/* Logo & Titre - Typo Éditoriale Nordic */}
          <div className="flex items-center gap-3 shrink-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                isDark
                  ? 'bg-gradient-to-b from-white/10 to-white/[0.02] border border-white/15 shadow-inner'
                  : 'bg-stone-950 text-white shadow-xs'
              }`}
            >
              <span className="font-serif italic font-semibold text-base sm:text-lg">fp</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif tracking-tight text-lg sm:text-xl font-normal text-stone-950 dark:text-stone-100 whitespace-nowrap">
                  FoodPlanner <span className="italic font-light text-stone-400">QC</span>
                </span>
                <span
                  className={`hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border whitespace-nowrap ${
                    isDark
                      ? 'bg-white/5 text-stone-300 border-white/10'
                      : 'bg-stone-100 text-stone-800 border-stone-200 font-medium'
                  }`}
                >
                  Metro QC
                </span>
                {coupleModeEnabled && (
                  <span
                    className={`hidden md:inline-flex text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border items-center gap-1 whitespace-nowrap ${
                      isDark
                        ? 'bg-white/5 text-stone-300 border-white/10'
                        : 'bg-stone-100 text-stone-800 border-stone-200 font-medium'
                    }`}
                  >
                    <Users className="w-2.5 h-2.5" /> Couple
                  </span>
                )}
              </div>
              <p
                className={`text-[11px] tracking-wide hidden 2xl:block truncate max-w-xs ${
                  isDark ? 'text-stone-400' : 'text-stone-500'
                }`}
              >
                {userSettings?.goalName || 'Prise de masse athlétique'} • Profil : <strong className="font-semibold text-stone-900 dark:text-stone-200">{activeAccount.name}</strong>
              </p>
            </div>
          </div>

          {/* Anneau / Pill Macros Style Apple Fitness Monochrome - STRICTEMENT 1 SEULE LIGNE */}
          <button
            onClick={() => setActiveTab('preferences')}
            className={`hidden xl:inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap shrink-0 flex-nowrap ${
              isDark
                ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-stone-200'
                : 'bg-stone-100/80 hover:bg-stone-200/80 border-stone-200/90 text-stone-800 shadow-xs'
            }`}
            title="Cliquez pour ajuster vos cibles caloriques et macro-nutritionnelles"
          >
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 shrink-0" />
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {userSettings?.targetCalories ?? 3050}
              </span>
              <span className={isDark ? 'text-stone-400 text-[11px]' : 'text-stone-500 text-[11px]'}>kcal</span>
            </div>
            <div className={`h-3 w-[1px] shrink-0 ${isDark ? 'bg-white/10' : 'bg-stone-300'}`} />
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap">
              <Dumbbell className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 shrink-0" />
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {userSettings?.targetProtein ?? 165}g
              </span>
              <span className={isDark ? 'text-stone-400 text-[11px]' : 'text-stone-500 text-[11px]'}>P</span>
            </div>
            <div className={`h-3 w-[1px] shrink-0 ${isDark ? 'bg-white/10' : 'bg-stone-300'}`} />
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap">
              <Wheat className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {userSettings?.targetCarbs ?? 390}g
              </span>
              <span className={isDark ? 'text-stone-400 text-[11px]' : 'text-stone-500 text-[11px]'}>G</span>
            </div>
            <div className={`h-3 w-[1px] shrink-0 ${isDark ? 'bg-white/10' : 'bg-stone-300'}`} />
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums whitespace-nowrap">
              <Droplet className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {userSettings?.targetFat ?? 90}g
              </span>
              <span className={isDark ? 'text-stone-400 text-[11px]' : 'text-stone-500 text-[11px]'}>L</span>
            </div>
          </button>

          {/* Sélecteur de Compte + Navigation + Theme Toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Account Switcher Dropdown */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl border transition-all active:scale-95 shrink-0 ${
                  isDark
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white'
                    : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-900 shadow-xs'
                }`}
                title="Changer de compte ou gérer les profils"
              >
                <div className="w-5 h-5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-mono text-[10px] font-bold shrink-0">
                  {activeAccount.avatarInitials}
                </div>
                <span className="text-xs font-medium max-w-[70px] sm:max-w-[110px] truncate">
                  {activeAccount.name}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-stone-400 transition-transform shrink-0 ${
                    isAccountMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Menu Déroulant Profils */}
              {isAccountMenuOpen && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-3xl p-3 border shadow-2xl z-50 animate-in fade-in duration-150 ${
                    isDark
                      ? 'bg-stone-950/95 border-white/10 text-white backdrop-blur-2xl'
                      : 'bg-white/95 border-stone-200 text-stone-900 backdrop-blur-2xl shadow-xl'
                  }`}
                >
                  <div className="px-3 py-2 border-b border-stone-200/60 dark:border-white/10 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 font-semibold block">
                      Profil Actif
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      Chaque profil a ses listes, objectifs et préférences
                    </span>
                  </div>

                  <div className="space-y-1">
                    {accounts.map((acc) => {
                      const isActive = acc.id === activeAccountId;
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            onSwitchAccount?.(acc.id);
                            setIsAccountMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                            isActive
                              ? isDark
                                ? 'bg-white/10 text-white font-semibold'
                                : 'bg-stone-100 text-stone-950 font-semibold'
                              : isDark
                              ? 'text-stone-300 hover:bg-white/5'
                              : 'text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                isActive
                                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
                                  : 'bg-stone-200 text-stone-700 dark:bg-white/10 dark:text-stone-300'
                              }`}
                            >
                              {acc.avatarInitials}
                            </div>
                            <span>{acc.name}</span>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-stone-900 dark:text-white shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 mt-2 border-t border-stone-200/60 dark:border-white/10 space-y-1">
                    <button
                      onClick={handleOpenRename}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                    >
                      <Pencil className="w-3 h-3 shrink-0" />
                      <span>Renommer « {activeAccount.name} »</span>
                    </button>
                    <button
                      onClick={handleOpenCreate}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      <span>Ajouter un profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nav Pill Liquid Glass */}
            <nav
              className={`flex items-center p-1 rounded-2xl border transition-all shrink-0 ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-stone-200/60 border-stone-300/60'
              }`}
            >
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'planner'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Planning de la semaine"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Semaine</span>
              </button>

              <button
                onClick={() => setActiveTab('recipes')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'recipes'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Livre de recettes"
              >
                <ChefHat className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Recettes</span>
              </button>

              <button
                onClick={() => setActiveTab('grocery')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'grocery'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Liste d'épicerie"
              >
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                <span>Épicerie</span>
                {groceryCount > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
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
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'tracker'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Suivi des calories et macros"
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Tracker</span>
              </button>

              <button
                onClick={() => setActiveTab('prices')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'prices'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Circulaires, rabais épicerie et calculateur de rentabilité protéique"
              >
                <Store className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline">Prix & Protéines</span>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                  activeTab === 'preferences'
                    ? isDark
                      ? 'bg-white text-stone-950 font-semibold shadow-md'
                      : 'bg-stone-900 text-stone-50 font-semibold shadow-sm'
                    : isDark
                    ? 'text-stone-400 hover:text-white'
                    : 'text-stone-700 hover:text-stone-950 font-medium'
                }`}
                title="Préférences et objectifs nutritionnels"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">Préférences</span>
              </button>
            </nav>

            {/* Toggle Mode Jour / Nuit */}
            <button
              onClick={onToggleTheme}
              aria-label="Basculer le thème Jour/Nuit"
              className={`p-2 sm:p-2.5 rounded-2xl border transition-all shrink-0 ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-stone-200'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-xs'
              }`}
              title={isDark ? 'Activer le mode Jour (Scandinavian Minimal)' : 'Activer le mode Nuit (Obsidian Glass)'}
            >
              {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            </button>
          </div>
        </div>
      </div>

      {/* Modal Renommer le Compte */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveRename}
            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isDark ? 'liquid-glass bg-stone-950/90 text-white border-white/10' : 'liquid-glass-light bg-white/95 text-stone-900 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-white/10">
              <h3 className="font-serif text-lg font-medium">Renommer le profil</h3>
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1">Nouveau nom du profil</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-stone-300 text-stone-900'
                }`}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Créer un Profil */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveCreate}
            className={`w-full max-w-sm rounded-3xl p-6 border shadow-2xl space-y-4 ${
              isDark ? 'liquid-glass bg-stone-950/90 text-white border-white/10' : 'liquid-glass-light bg-white/95 text-stone-900 border-stone-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-white/10">
              <h3 className="font-serif text-lg font-medium">Nouveau profil</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-mono text-stone-400 mb-1">Prénom ou nom du profil</label>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="ex: Sarah"
                className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-stone-300 text-stone-900'
                }`}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs"
              >
                Créer le profil
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
