'use client';

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { INGREDIENTS } from '@/data/ingredients';
import { AISLE_LABELS } from '@/lib/grocery';
import { 
  Ingredient,
  MetroAisle, 
  ProductPreferenceStatus, 
  ProductPreferencesMap, 
  UserCustomizationSettings, 
  DEFAULT_USER_SETTINGS,
  DEFAULT_LAURINE_SETTINGS,
  UserAccount,
  DEFAULT_ACCOUNTS 
} from '@/types';
import { 
  Heart, 
  Ban, 
  Search, 
  Database, 
  Sparkles, 
  ExternalLink, 
  RefreshCw,
  RotateCcw,
  Check,
  SlidersHorizontal,
  ShoppingBag,
  DollarSign,
  Pencil,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Users,
  Target,
  X,
  ScanBarcode,
  Trash2,
  ArrowUpDown,
  Home,
  Download,
  Upload,
  Plus
} from 'lucide-react';
import { calculateProteinEfficiency } from '@/lib/protein-calculator';

interface ProductPreferencesViewProps {
  preferences: ProductPreferencesMap;
  customPrices?: Record<string, number>;
  userSettings?: UserCustomizationSettings;
  accounts?: UserAccount[];
  activeAccountId?: string;
  isDark: boolean;
  customProducts?: Ingredient[];
  pantryMap?: Record<string, boolean>;
  onOpenBarcodeModal?: () => void;
  onOpenProductCreator?: () => void;
  onDeleteCustomProduct?: (id: string) => void;
  onTogglePantry?: (ingredientId: string) => void;
  onAddToGroceryList?: (ingredient: Ingredient, forAccount?: string) => void;
  onBackupRestored?: () => void;
  onUpdatePreference: (ingredientId: string, status: ProductPreferenceStatus) => void;
  onUpdateCustomPrice?: (ingredientId: string, price: number | null) => void;
  onUpdateSettings?: (settings: Partial<UserCustomizationSettings>) => void;
  onSwitchAccount?: (accountId: string) => void;
  onResetAllPreferences: () => void;
  onApplyPreferencesToPlan: () => void;
}

const ProductPreferencesViewComponent: React.FC<ProductPreferencesViewProps> = ({
  preferences,
  customPrices = {},
  userSettings = DEFAULT_USER_SETTINGS,
  accounts = DEFAULT_ACCOUNTS,
  activeAccountId = 'ethan',
  isDark,
  customProducts = [],
  pantryMap = {},
  onOpenBarcodeModal,
  onOpenProductCreator,
  onDeleteCustomProduct,
  onTogglePantry,
  onAddToGroceryList,
  onBackupRestored,
  onUpdatePreference,
  onUpdateCustomPrice,
  onUpdateSettings,
  onSwitchAccount,
  onResetAllPreferences,
  onApplyPreferencesToPlan,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'settings'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedAisle, setSelectedAisle] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'liked' | 'disliked' | 'neutral' | 'pantry'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'protein_ratio' | 'protein_pct' | 'price_asc'>('default');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || 'Erreur lors de la restauration');
        return;
      }

      setSaveToast('Base de données restaurée avec succès !');
      onBackupRestored?.();
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err: any) {
      alert('Fichier invalide : ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  // État local pour le formulaire de cibles nutritionnelles & budget
  const [localSettings, setLocalSettings] = useState<UserCustomizationSettings>(userSettings);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);

  useEffect(() => {
    setLocalSettings(userSettings);
    setIsSettingsDirty(false);
  }, [userSettings]);

  // État pour la modale d'édition de prix d'un produit
  const [editingPriceItem, setEditingPriceItem] = useState<{
    id: string;
    name: string;
    defaultPrice: number;
    currentPrice: number;
    unitLabel: string;
  } | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');

  // Catalogue fusionné (produits statiques + produits ajoutés par code-barres)
  const catalog = useMemo<Record<string, Ingredient>>(() => {
    const customMap: Record<string, Ingredient> = Object.fromEntries(
      (customProducts || []).map((p: Ingredient) => [p.id, p])
    );
    return { ...INGREDIENTS, ...customMap };
  }, [customProducts]);

  const allIngredients = useMemo<Ingredient[]>(() => Object.values(catalog), [catalog]);

  // Précalcul O(1) de l'efficience protéique pour tous les ingrédients
  const proteinEfficiencyMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof calculateProteinEfficiency>> = {};
    for (const item of allIngredients) {
      if (item.macrosPer100g && item.macrosPer100g.protein > 0) {
        const activePrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.packaging.exactPriceMetro;
        map[item.id] = calculateProteinEfficiency(
          activePrice,
          item.packaging.amount,
          item.packaging.unit,
          item.macrosPer100g.protein,
          item.id
        );
      }
    }
    return map;
  }, [allIngredients, customPrices]);

  // Pagination / Rendu progressif pour une fluidité 120 FPS
  const [displayLimit, setDisplayLimit] = useState(30);

  useEffect(() => {
    setDisplayLimit(30);
  }, [deferredSearch, selectedAisle, selectedFilter, sortBy]);

  // Compteurs
  const likedCount = allIngredients.filter((i: Ingredient) => preferences[i.id] === 'liked').length;
  const dislikedCount = allIngredients.filter((i: Ingredient) => preferences[i.id] === 'disliked').length;
  const neutralCount = allIngredients.length - likedCount - dislikedCount;
  const pantryCount = allIngredients.filter((i: Ingredient) => Boolean(pantryMap[i.id])).length;
  const customPricesCount = Object.keys(customPrices).length;

  // Filtrage et tri du catalogue
  const filteredIngredients = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const list = allIngredients.filter((item: Ingredient) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.packaging.label.toLowerCase().includes(query) ||
        (item.barcode && item.barcode.includes(query));

      if (!matchesSearch) return false;

      if (selectedAisle !== 'all' && item.aisle !== selectedAisle) return false;

      if (selectedFilter === 'pantry') {
        if (!pantryMap[item.id]) return false;
      } else if (selectedFilter !== 'all') {
        const currentStatus = preferences[item.id] || 'neutral';
        if (currentStatus !== selectedFilter) return false;
      }

      return true;
    });

    if (sortBy === 'protein_ratio') {
      return [...list].sort((a, b) => {
        const effA = proteinEfficiencyMap[a.id];
        const effB = proteinEfficiencyMap[b.id];
        if (!effA && !effB) return 0;
        if (!effA) return 1;
        if (!effB) return -1;
        return effA.costPer100gProtein - effB.costPer100gProtein;
      });
    }

    if (sortBy === 'protein_pct') {
      return [...list].sort((a, b) => (b.macrosPer100g?.protein ?? 0) - (a.macrosPer100g?.protein ?? 0));
    }

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => {
        const priceA = customPrices[a.id] ?? a.packaging.exactPriceMetro;
        const priceB = customPrices[b.id] ?? b.packaging.exactPriceMetro;
        return priceA - priceB;
      });
    }

    return list;
  }, [allIngredients, deferredSearch, selectedAisle, preferences, selectedFilter, sortBy, customPrices, proteinEfficiencyMap]);

  const handleSelectPreference = (id: string, newStatus: ProductPreferenceStatus, name: string) => {
    onUpdatePreference(id, newStatus);
    const label =
      newStatus === 'liked'
        ? `"${name}" ajouté à vos favoris (sauvegardé dans SQLite)`
        : newStatus === 'disliked'
        ? `"${name}" exclu des achats et recettes (sauvegardé dans SQLite)`
        : `"${name}" réinitialisé à neutre`;
    setSaveToast(label);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleOpenPriceModal = (item: (typeof allIngredients)[0]) => {
    const activePrice = customPrices[item.id] !== undefined ? customPrices[item.id] : item.packaging.exactPriceMetro;
    setEditingPriceItem({
      id: item.id,
      name: item.name,
      defaultPrice: item.packaging.exactPriceMetro,
      currentPrice: activePrice,
      unitLabel: item.packaging.label,
    });
    setCustomPriceInput(activePrice.toFixed(2));
  };

  const handleSaveCustomPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingPriceItem || !onUpdateCustomPrice) return;

    const parsed = parseFloat(customPriceInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateCustomPrice(editingPriceItem.id, Math.round(parsed * 100) / 100);
      setSaveToast(`Prix personnalisé pour "${editingPriceItem.name}" fixé à ${parsed.toFixed(2)} $ CAD`);
    } else {
      onUpdateCustomPrice(editingPriceItem.id, null);
      setSaveToast(`Prix de "${editingPriceItem.name}" rétabli au tarif Metro`);
    }
    setEditingPriceItem(null);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleResetCustomPrice = (ingredientId: string, name: string) => {
    if (!onUpdateCustomPrice) return;
    onUpdateCustomPrice(ingredientId, null);
    setSaveToast(`Tarif Metro d'origine rétabli pour "${name}"`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveSettings = () => {
    if (onUpdateSettings) {
      onUpdateSettings(localSettings);
      setIsSettingsDirty(false);
      setSaveToast('Cibles métaboliques et budget enregistrés dans SQLite');
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  const handleResetSettingsToDefault = () => {
    const base = (activeAccountId === 'laurine' || activeAccountId === 'copine') ? DEFAULT_LAURINE_SETTINGS : DEFAULT_USER_SETTINGS;
    setLocalSettings(base);
    setIsSettingsDirty(true);
  };

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-8">
      {/* Toast de confirmation SQLite */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-2xl border border-stone-800 dark:border-white text-xs font-mono font-medium">
            <Database className="w-4 h-4 text-stone-400 dark:text-stone-600" />
            <span>{saveToast}</span>
          </div>
        </div>
      )}

      {/* Modale d'édition de prix d'un produit */}
      {editingPriceItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
          <div className={`rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border space-y-4 max-h-[90vh] overflow-y-auto ${cardGlassClass}`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-white">
                  Prix Personnalisé
                </h3>
              </div>
              <button
                onClick={() => setEditingPriceItem(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="font-serif text-base font-normal text-stone-900 dark:text-white">
                {editingPriceItem.name}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-0.5">
                Format standard : {editingPriceItem.unitLabel} • Tarif Metro officiel :{' '}
                <span className="font-mono font-semibold text-stone-800 dark:text-stone-200">
                  {editingPriceItem.defaultPrice.toFixed(2)} $ CAD
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveCustomPrice} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 font-semibold">
                  Votre prix réel payé en magasin ($ CAD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    max="999.00"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    autoFocus
                    className={`w-full pl-4 pr-12 py-2.5 rounded-2xl text-base font-mono tabular-nums border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-stone-400">
                    $ CAD
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleResetCustomPrice(editingPriceItem.id, editingPriceItem.name);
                    setEditingPriceItem(null);
                  }}
                  className="text-xs font-mono text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                >
                  Rétablir tarif Metro
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPriceItem(null)}
                    className="px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-stone-400 hover:text-stone-900 dark:hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all shadow-xs ${
                      isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'
                    }`}
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* En-tête Éditorial & Switch d'Onglets */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Base de Données SQLite Locale
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                data/food_planner.sqlite
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Personnalisation & <span className="italic font-light">Préférences</span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2 max-w-2xl font-sans leading-relaxed">
              Ajustez vos cibles de calories, protéines et budget d'épicerie, ou personnalisez les prix et le statut de chaque aliment du catalogue. Toutes vos données sont sauvegardées localement.
            </p>

            {/* Profil Actif Toggle */}
            {accounts && accounts.length > 0 && (
              <div className="flex items-center gap-1.5 mt-3 p-1 rounded-2xl border bg-stone-100/70 dark:bg-white/[0.04] border-stone-200/80 dark:border-white/10 w-fit">
                <span className="text-[11px] font-mono text-stone-500 px-2 uppercase tracking-wider font-semibold">
                  Profil :
                </span>
                {accounts.map((acc) => {
                  const isActive = acc.id === activeAccountId;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => onSwitchAccount?.(acc.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all ${
                        isActive
                          ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-stone-300 dark:bg-white/20 text-stone-900 dark:text-white flex items-center justify-center text-[8px] font-bold">
                        {acc.avatarInitials}
                      </div>
                      <span>{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start lg:self-auto flex-wrap">
            <a
              href="/api/backup"
              download
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-all border shrink-0 ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-stone-200'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-xs'
              }`}
              title="Télécharger une copie de sauvegarde JSON complète de votre base SQLite"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Sauvegarder BD</span>
            </a>

            <label
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-all border shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-stone-200'
                  : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-800 shadow-xs'
              }`}
              title="Restaurer vos données depuis un fichier de sauvegarde JSON"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurer</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreBackupFile}
              />
            </label>

            <button
              onClick={onApplyPreferencesToPlan}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border active:scale-95 font-semibold ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200 border-white'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800 border-stone-900 shadow-xs'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser le menu</span>
            </button>
          </div>
        </div>

        {/* Navigation Secondaire : Cibles vs Catalogue */}
        <div className="flex items-center gap-2 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-stone-200/60 dark:border-white/10 font-mono text-xs overflow-x-auto scrollbar-none flex-nowrap">
          <button
            onClick={() => setActiveSubTab('catalog')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'catalog'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold shadow-sm'
                  : 'bg-stone-900 text-stone-50 font-bold shadow-sm'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span>Catalogue & Prix ({allIngredients.length})</span>
            {customPricesCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-semibold shrink-0">
                {customPricesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl transition-all shrink-0 ${
              activeSubTab === 'settings'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold shadow-sm'
                  : 'bg-stone-900 text-stone-50 font-bold shadow-sm'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>Cibles & Budget</span>
          </button>
        </div>
      </div>

      {/* VUE 1 : VARIABLES MÉTABOLIQUES & BUDGET */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className={`rounded-3xl p-6 sm:p-8 border transition-all space-y-6 ${cardGlassClass}`}>
            <div className="flex items-center justify-between pb-4 border-b border-stone-200/60 dark:border-white/10">
              <div>
                <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                  Variables Personnelles <span className="italic font-light">(Ethan • Sportif)</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Configurez vos cibles caloriques et macro-nutritionnelles. Ces valeurs pilotent l'anneau du Tracker et le calibrage des portions.
                </p>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-white/10 font-semibold">
                Profil Actif
              </span>
            </div>

            {/* Objectif principal */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2 font-semibold">
                Objectif Actuel
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  'Prise de masse athlétique',
                  'Maintien & Recomposition',
                  'Sèche & Définition musculaire',
                ].map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => {
                      setLocalSettings((prev) => ({ ...prev, goalName: goal }));
                      setIsSettingsDirty(true);
                    }}
                    className={`px-3.5 py-2.5 rounded-2xl text-xs font-mono text-left transition-all border ${
                      localSettings.goalName === goal
                        ? isDark
                          ? 'bg-white text-stone-950 font-bold border-white'
                          : 'bg-stone-900 text-stone-50 font-bold border-stone-900 shadow-sm'
                        : isDark
                        ? 'bg-white/[0.02] border-white/10 text-stone-400 hover:text-white'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders & Inputs des 4 Piliers Nutritionnels Profil Actif */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {/* 1. Calories */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Calories
                  </span>
                  <input
                    type="number"
                    min="1500"
                    max="4500"
                    step="50"
                    value={localSettings.targetCalories}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, targetCalories: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-20 text-right px-2 py-0.5 rounded-lg text-xs font-mono font-bold tabular-nums border ${
                      isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min="1800"
                  max="4200"
                  step="50"
                  value={localSettings.targetCalories}
                  onChange={(e) => {
                    setLocalSettings((prev) => ({ ...prev, targetCalories: Number(e.target.value) }));
                    setIsSettingsDirty(true);
                  }}
                  className="w-full accent-stone-900 dark:accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>1 800</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">kcal/jour</span>
                  <span>4 200</span>
                </div>
              </div>

              {/* 2. Protéines */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Protéines
                  </span>
                  <input
                    type="number"
                    min="50"
                    max="280"
                    step="5"
                    value={localSettings.targetProtein}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, targetProtein: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-16 text-right px-2 py-0.5 rounded-lg text-xs font-mono font-bold tabular-nums border ${
                      isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min="60"
                  max="260"
                  step="5"
                  value={localSettings.targetProtein}
                  onChange={(e) => {
                    setLocalSettings((prev) => ({ ...prev, targetProtein: Number(e.target.value) }));
                    setIsSettingsDirty(true);
                  }}
                  className="w-full accent-stone-900 dark:accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>60 g</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">g/jour</span>
                  <span>260 g</span>
                </div>
              </div>

              {/* 3. Glucides */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                    <Wheat className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Glucides
                  </span>
                  <input
                    type="number"
                    min="80"
                    max="600"
                    step="10"
                    value={localSettings.targetCarbs}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, targetCarbs: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-16 text-right px-2 py-0.5 rounded-lg text-xs font-mono font-bold tabular-nums border ${
                      isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min="100"
                  max="550"
                  step="10"
                  value={localSettings.targetCarbs}
                  onChange={(e) => {
                    setLocalSettings((prev) => ({ ...prev, targetCarbs: Number(e.target.value) }));
                    setIsSettingsDirty(true);
                  }}
                  className="w-full accent-stone-900 dark:accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>100 g</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">g/jour</span>
                  <span>550 g</span>
                </div>
              </div>

              {/* 4. Lipides */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" /> Lipides
                  </span>
                  <input
                    type="number"
                    min="30"
                    max="180"
                    step="5"
                    value={localSettings.targetFat}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, targetFat: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-16 text-right px-2 py-0.5 rounded-lg text-xs font-mono font-bold tabular-nums border ${
                      isDark ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <input
                  type="range"
                  min="30"
                  max="160"
                  step="5"
                  value={localSettings.targetFat}
                  onChange={(e) => {
                    setLocalSettings((prev) => ({ ...prev, targetFat: Number(e.target.value) }));
                    setIsSettingsDirty(true);
                  }}
                  className="w-full accent-stone-900 dark:accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>30 g</span>
                  <span className="font-semibold text-stone-700 dark:text-stone-300">g/jour</span>
                  <span>160 g</span>
                </div>
              </div>
            </div>

            {/* Répartition Mathématique des Macros Active */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs ${
              isDark ? 'bg-white/[0.02] border-white/5 text-stone-300' : 'bg-stone-100/70 border-stone-200 text-stone-700'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-wider text-stone-400 font-semibold">Répartition énergétique :</span>
                <span className="font-bold text-stone-950 dark:text-white">
                  {(localSettings.targetProtein * 4) + (localSettings.targetCarbs * 4) + (localSettings.targetFat * 9)} kcal calculées
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] tabular-nums">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-900 dark:bg-stone-200" />
                  <span>Protéines : {Math.round(((localSettings.targetProtein * 4) / Math.max(1, (localSettings.targetProtein * 4) + (localSettings.targetCarbs * 4) + (localSettings.targetFat * 9))) * 100)}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-500 dark:bg-stone-400" />
                  <span>Glucides : {Math.round(((localSettings.targetCarbs * 4) / Math.max(1, (localSettings.targetProtein * 4) + (localSettings.targetCarbs * 4) + (localSettings.targetFat * 9))) * 100)}%</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-stone-400 dark:bg-stone-500" />
                  <span>Lipides : {Math.round(((localSettings.targetFat * 9) / Math.max(1, (localSettings.targetProtein * 4) + (localSettings.targetCarbs * 4) + (localSettings.targetFat * 9))) * 100)}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section Budget & Couple */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget Hebdomadaire */}
            <div className={`rounded-3xl p-6 sm:p-7 border space-y-4 ${cardGlassClass}`}>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-white">
                  Budget d'Épicerie Cible
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                Définissez votre plafond hebdomadaire pour les courses chez Metro. Une jauge d'alerte s'affichera sur votre ticket de caisse.
              </p>

              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs font-mono">
                  <span className="text-stone-600 dark:text-stone-400">Plafond Semaine :</span>
                  <span className="font-bold text-stone-950 dark:text-white text-base">
                    {localSettings.targetWeeklyBudget} $ CAD
                  </span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="250"
                  step="5"
                  value={localSettings.targetWeeklyBudget}
                  onChange={(e) => {
                    setLocalSettings((prev) => ({ ...prev, targetWeeklyBudget: Number(e.target.value) }));
                    setIsSettingsDirty(true);
                  }}
                  className="w-full accent-stone-900 dark:accent-white"
                />
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>80 $</span>
                  <span>135 $ (Moyenne)</span>
                  <span>250 $</span>
                </div>
              </div>
            </div>

            {/* Profil Laurine / Mode Couple - 4 Piliers */}
            <div className={`rounded-3xl p-6 sm:p-7 border space-y-4 ${cardGlassClass}`}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-white">
                  Variables Partenaire <span className="italic font-light">(Laurine)</span>
                </h3>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                Ajustez les besoins métaboliques complets de Laurine (Calories, Protéines, Glucides, Lipides). Ces cibles pilotent la pondération mathématique exacte du partage des coûts d'épicerie.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Calories (kcal)
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={localSettings.partnerCalories}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, partnerCalories: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums border ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1 flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" /> Protéines (g)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={localSettings.partnerProtein}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, partnerProtein: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums border ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1 flex items-center gap-1">
                    <Wheat className="w-3 h-3" /> Glucides (g)
                  </label>
                  <input
                    type="number"
                    step="10"
                    value={localSettings.partnerCarbs ?? 230}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, partnerCarbs: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums border ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase text-stone-500 mb-1 flex items-center gap-1">
                    <Droplet className="w-3 h-3" /> Lipides (g)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={localSettings.partnerFat ?? 60}
                    onChange={(e) => {
                      setLocalSettings((prev) => ({ ...prev, partnerFat: Number(e.target.value) || 0 }));
                      setIsSettingsDirty(true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono tabular-nums border ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Barre d'action / Enregistrement */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleResetSettingsToDefault}
              className="text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Valeurs recommandées par défaut</span>
            </button>

            <button
              onClick={handleSaveSettings}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border font-semibold active:scale-95 shadow-md ${
                isDark ? 'bg-white text-stone-950 hover:bg-stone-200 border-white' : 'bg-stone-900 text-white hover:bg-stone-800 border-stone-900'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Enregistrer dans SQLite</span>
            </button>
          </div>
        </div>
      )}

      {/* VUE 2 : CATALOGUE & PRIX DES PRODUITS */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Baromètre de Préférences & Garde-Manger */}
          <div className={`p-5 rounded-3xl border ${cardGlassClass}`}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFilter === 'all'
                    ? isDark
                      ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                      : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                    selectedFilter === 'all' && !isDark ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  Total Catalogue
                </div>
                <div
                  className={`font-mono tabular-nums text-2xl font-light mt-0.5 ${
                    selectedFilter === 'all' && !isDark ? 'text-white' : 'text-stone-900 dark:text-white'
                  }`}
                >
                  {allIngredients.length}
                </div>
              </button>

              <button
                onClick={() => setSelectedFilter('pantry')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFilter === 'pantry'
                    ? isDark
                      ? 'bg-emerald-500/20 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 ${
                    selectedFilter === 'pantry' && !isDark ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  <Home className="w-3 h-3" /> Garde-manger
                </div>
                <div
                  className={`font-mono tabular-nums text-2xl font-medium mt-0.5 ${
                    selectedFilter === 'pantry' && !isDark ? 'text-white' : 'text-stone-900 dark:text-white'
                  }`}
                >
                  {pantryCount}
                </div>
              </button>

              <button
                onClick={() => setSelectedFilter('liked')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFilter === 'liked'
                    ? isDark
                      ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                      : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-stone-200 shadow-xs hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-semibold ${
                    selectedFilter === 'liked' && !isDark ? 'text-stone-200' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Heart
                    className={`w-3 h-3 ${
                      selectedFilter === 'liked' && !isDark ? 'text-white fill-white' : 'text-stone-900 dark:text-stone-100 fill-stone-900 dark:fill-stone-100'
                    }`}
                  />{' '}
                  J'aime acheter
                </div>
                <div
                  className={`font-mono tabular-nums text-2xl font-medium mt-0.5 ${
                    selectedFilter === 'liked' && !isDark ? 'text-white' : 'text-stone-950 dark:text-white'
                  }`}
                >
                  {likedCount}
                </div>
              </button>

              <button
                onClick={() => setSelectedFilter('disliked')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFilter === 'disliked'
                    ? isDark
                      ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                      : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-stone-200 shadow-xs hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-semibold ${
                    selectedFilter === 'disliked' && !isDark ? 'text-stone-200' : 'text-stone-600 dark:text-stone-400'
                  }`}
                >
                  <Ban
                    className={`w-3 h-3 ${
                      selectedFilter === 'disliked' && !isDark ? 'text-white' : 'text-stone-700 dark:text-stone-300'
                    }`}
                  />{' '}
                  Ne pas acheter
                </div>
                <div
                  className={`font-mono tabular-nums text-2xl font-medium mt-0.5 ${
                    selectedFilter === 'disliked' && !isDark ? 'text-white' : 'text-stone-950 dark:text-white'
                  }`}
                >
                  {dislikedCount}
                </div>
              </button>

              <button
                onClick={() => setSelectedFilter('neutral')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedFilter === 'neutral'
                    ? isDark
                      ? 'bg-white/15 border-white/30 ring-1 ring-white/20'
                      : 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : isDark
                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <div
                  className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                    selectedFilter === 'neutral' && !isDark ? 'text-stone-300' : 'text-stone-500 dark:text-stone-400'
                  }`}
                >
                  Non spécifiés
                </div>
                <div
                  className={`font-mono tabular-nums text-2xl font-light mt-0.5 ${
                    selectedFilter === 'neutral' && !isDark ? 'text-white' : 'text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {neutralCount}
                </div>
              </button>
            </div>
          </div>

          {/* Barre de Recherche et Rayons */}
          <div
            className={`p-4 rounded-3xl border space-y-3 ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher un produit... (ex: champignons, dinde, gruau)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl sm:rounded-2xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                    isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              {/* Sélecteur de Tri & Action Code-barres */}
              <div className="flex items-center gap-2">
                <div className="flex-1 sm:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`w-full sm:w-auto px-3 py-2.5 rounded-xl sm:rounded-2xl border text-xs font-mono transition-all outline-hidden ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-stone-200'
                        : 'bg-white border-stone-300 text-stone-800 shadow-xs'
                    }`}
                    title="Trier la liste de produits"
                  >
                    <option value="default">Tri : Rayon</option>
                    <option value="protein_ratio">Rentabilité ($/100g P)</option>
                    <option value="protein_pct">Teneur (% prot)</option>
                    <option value="price_asc">Prix ($)</option>
                  </select>
                </div>

                {onOpenProductCreator && (
                  <button
                    type="button"
                    onClick={onOpenProductCreator}
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl sm:rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-all border shrink-0 active:scale-95 shadow-sm ${
                      isDark
                        ? 'bg-white text-stone-950 hover:bg-stone-200 border-white'
                        : 'bg-stone-900 text-stone-50 hover:bg-stone-800 border-stone-900 shadow-xs'
                    }`}
                    title="Ajouter manuellement un aliment sans code-barres"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span className="text-[11px]">+ Produit</span>
                  </button>
                )}

                {onOpenBarcodeModal && (
                  <button
                    type="button"
                    onClick={onOpenBarcodeModal}
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl sm:rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-all border shrink-0 active:scale-95 shadow-sm ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                        : 'bg-white hover:bg-stone-50 border-stone-300 text-stone-900 shadow-xs'
                    }`}
                    title="Scanner ou entrer un code-barres pour ajouter un produit à la base"
                  >
                    <ScanBarcode className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-[11px]">+ Code-barres</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filtres par Rayons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
              <button
                onClick={() => setSelectedAisle('all')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                  selectedAisle === 'all'
                    ? isDark
                      ? 'bg-white text-stone-950 font-bold'
                      : 'bg-stone-900 text-stone-50 font-bold'
                    : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                Tous les rayons
              </button>
              {Object.entries(AISLE_LABELS).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => setSelectedAisle(key)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                    selectedAisle === key
                      ? isDark
                        ? 'bg-white text-stone-950 font-bold'
                        : 'bg-stone-900 text-stone-50 font-bold'
                      : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                  }`}
                >
                  {meta.title}
                </button>
              ))}
            </div>
          </div>

          {/* Grille des Produits du Catalogue avec Édition de Prix */}
          {filteredIngredients.length === 0 ? (
            <div className={`text-center py-12 rounded-3xl border ${cardGlassClass}`}>
              <Ban className="w-8 h-8 text-stone-400 mx-auto mb-2 opacity-60" />
              <p className="text-stone-500 text-xs font-mono uppercase tracking-wider">
                Aucun produit ne correspond à ces critères
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredIngredients.slice(0, displayLimit).map((item: Ingredient) => {
                  const currentStatus = preferences[item.id] || 'neutral';
                  const isLiked = currentStatus === 'liked';
                  const isDisliked = currentStatus === 'disliked';
                  const hasCustomPrice = customPrices[item.id] !== undefined && customPrices[item.id] > 0;
                  const activePrice = hasCustomPrice ? customPrices[item.id] : item.packaging.exactPriceMetro;

                  // Calcul du prix unitaire avec prix personnalisé
                  let unitPriceLabel = item.packaging.unitPriceLabel;
                  if (hasCustomPrice && item.packaging.amount > 0) {
                    if (item.packaging.unit === 'g' || item.packaging.unit === 'ml') {
                      const rate = ((activePrice / item.packaging.amount) * 100).toFixed(2);
                      unitPriceLabel = `${rate} $ / 100${item.packaging.unit}`;
                    } else {
                      const rate = (activePrice / item.packaging.amount).toFixed(2);
                      unitPriceLabel = `${rate} $ / unité`;
                    }
                  }

                  const eff = proteinEfficiencyMap[item.id];

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between ${
                        isLiked
                          ? isDark
                            ? 'bg-white/[0.06] border-white/30 ring-1 ring-white/10'
                            : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                          : isDisliked
                          ? 'opacity-60 grayscale bg-stone-100/50 dark:bg-black/30 border-stone-300/60 dark:border-white/5'
                          : isDark
                          ? 'bg-white/[0.02] border-white/5 hover:border-white/15'
                          : 'bg-white border-stone-200/90 hover:border-stone-300 shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start gap-3">
                          {item.imageUrl && (
                            <div
                              className={`w-14 h-14 rounded-2xl overflow-hidden shrink-0 border relative ${
                                isDark ? 'border-white/10 bg-black/40' : 'border-stone-200 bg-stone-100'
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                decoding="async"
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                                {AISLE_LABELS[item.aisle as MetroAisle]?.title || item.aisle}
                              </span>
                              {item.barcode && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                                  Code-barres : {item.barcode}
                                </span>
                              )}
                              {item.packaging.isMoiMemberPrice && !hasCustomPrice && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-md bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20 font-semibold">
                                  Moi
                                </span>
                              )}
                              {hasCustomPrice && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-md bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold flex items-center gap-0.5">
                                  <Pencil className="w-2.5 h-2.5" /> Prix Custom
                                </span>
                              )}
                            </div>

                            <h3 className="font-serif text-sm font-medium text-stone-900 dark:text-white mt-0.5 leading-snug">
                              {item.name}
                            </h3>

                            <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
                              {item.packaging.label}
                            </div>

                            {/* Prix et déclencheur d'édition */}
                            <div className="flex items-baseline gap-2 mt-1.5 font-mono text-xs">
                              <button
                                onClick={() => handleOpenPriceModal(item)}
                                className="font-semibold text-stone-950 dark:text-white hover:underline flex items-center gap-1 text-left"
                                title="Cliquer pour modifier votre prix réel d'achat pour ce produit"
                              >
                                <span>{activePrice.toFixed(2)} $</span>
                                <Pencil className="w-2.5 h-2.5 text-stone-400 opacity-60" />
                              </button>

                              {unitPriceLabel && (
                                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                                  ({unitPriceLabel})
                                </span>
                              )}
                            </div>

                            {/* Accès Direct aux Macros du Produit (/100g) */}
                            {item.macrosPer100g && (
                              <div className="grid grid-cols-4 gap-1 mt-2.5 p-1.5 rounded-xl bg-stone-100/70 dark:bg-white/5 border border-stone-200/60 dark:border-white/10 text-center font-mono text-[10px]">
                                <div>
                                  <div className="text-stone-500 dark:text-stone-400 text-[9px] uppercase">Cals</div>
                                  <div className="font-semibold text-stone-900 dark:text-white tabular-nums">{item.macrosPer100g.calories}</div>
                                </div>
                                <div>
                                  <div className="text-stone-500 dark:text-stone-400 text-[9px] uppercase">Prot</div>
                                  <div className="font-semibold text-stone-900 dark:text-white tabular-nums">{item.macrosPer100g.protein}g</div>
                                </div>
                                <div>
                                  <div className="text-stone-500 dark:text-stone-400 text-[9px] uppercase">Gluc</div>
                                  <div className="font-medium text-stone-700 dark:text-stone-300 tabular-nums">{item.macrosPer100g.carbs}g</div>
                                </div>
                                <div>
                                  <div className="text-stone-500 dark:text-stone-400 text-[9px] uppercase">Lip</div>
                                  <div className="font-medium text-stone-700 dark:text-stone-300 tabular-nums">{item.macrosPer100g.fat}g</div>
                                </div>
                              </div>
                            )}

                            {/* Rentabilité Protéique ($/100g P) */}
                            {eff && (
                              <div className="mt-2 flex items-center justify-between text-[10px] font-mono p-1.5 rounded-xl border border-stone-200/60 dark:border-white/10 bg-stone-100/60 dark:bg-white/[0.03]">
                                <span className="text-stone-500 dark:text-stone-400 flex items-center gap-1">
                                  <Dumbbell className="w-3 h-3 text-stone-400" /> Rentabilité :
                                </span>
                                <span className={`font-semibold px-1.5 py-0.5 rounded-md border text-[9px] ${eff.tierColorClass.badge}`}>
                                  {eff.costPer100gProtein.toFixed(2)} $ / 100g P
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sélecteur de Préférence 3-États, Garde-manger & Actions */}
                      <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-white/10 flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {/* Bouton J'aime */}
                          <button
                            onClick={() =>
                              handleSelectPreference(item.id, isLiked ? 'neutral' : 'liked', item.name)
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                              isLiked
                                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold shadow-xs'
                                : isDark
                                ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                            title={isLiked ? 'Retirer des favoris' : 'Marquer comme produit aimé'}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                isLiked ? 'fill-current text-white dark:text-stone-950' : 'text-stone-500'
                              }`}
                            />
                            <span className="hidden sm:inline">J'aime</span>
                          </button>

                          {/* Bouton Ne pas acheter */}
                          <button
                            onClick={() =>
                              handleSelectPreference(item.id, isDisliked ? 'neutral' : 'disliked', item.name)
                            }
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                              isDisliked
                                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-bold shadow-xs'
                                : isDark
                                ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                            title={isDisliked ? 'Réautoriser ce produit' : 'Bannir ce produit de vos achats et recettes'}
                          >
                            <Ban className={`w-3.5 h-3.5 ${isDisliked ? 'text-white dark:text-stone-950' : 'text-stone-500'}`} />
                            <span className="hidden sm:inline">Exclure</span>
                          </button>

                          {/* Bouton Garde-manger */}
                          <button
                            onClick={() => {
                              onTogglePantry?.(item.id);
                              const isNowInPantry = !pantryMap[item.id];
                              setSaveToast(
                                isNowInPantry
                                  ? `« ${item.name} » ajouté à votre garde-manger !`
                                  : `« ${item.name} » retiré du garde-manger.`
                              );
                              setTimeout(() => setSaveToast(null), 2500);
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all ${
                              Boolean(pantryMap[item.id])
                                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs'
                                : isDark
                                ? 'bg-white/5 hover:bg-white/10 text-stone-300 border border-white/10'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                            }`}
                            title={Boolean(pantryMap[item.id]) ? 'En stock au garde-manger (cliquez pour retirer)' : 'Marquer comme en stock dans le garde-manger'}
                          >
                            <Home className={`w-3.5 h-3.5 ${Boolean(pantryMap[item.id]) ? 'fill-current text-emerald-500' : 'text-stone-500'}`} />
                            <span className="text-[11px]">{Boolean(pantryMap[item.id]) ? 'En stock' : 'Garde-manger'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Bouton Ajouter à l'épicerie */}
                          {onAddToGroceryList && (
                            <button
                              onClick={() => {
                                onAddToGroceryList(item);
                                setSaveToast(`« ${item.name} » ajouté à l'épicerie !`);
                                setTimeout(() => setSaveToast(null), 2500);
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono transition-all font-semibold active:scale-95 ${
                                isDark
                                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                                  : 'bg-stone-900 hover:bg-stone-800 text-stone-50 shadow-xs'
                              }`}
                              title="Ajouter cet aliment à la liste d'épicerie"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span className="text-[11px]">+ Épicerie</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenPriceModal(item)}
                            className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
                            title="Modifier le prix d'achat de cet article"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>

                          {item.metroProductUrl && (
                            <a
                              href={item.metroProductUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
                              title={item.metroProductUrl.includes('/p/') ? "Fiche produit directe Metro.ca (UPC certifié)" : "Rechercher ce produit sur Metro.ca"}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {item.isCustom && onDeleteCustomProduct && (
                            <button
                              onClick={() => onDeleteCustomProduct(item.id)}
                              className="p-1.5 text-stone-400 hover:text-red-500 transition-colors"
                              title="Supprimer ce produit personnalisé de la base de données"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bouton de Rendu Progressif (Afficher Plus) */}
              {displayLimit < filteredIngredients.length && (
                <div className="flex justify-center pt-4 pb-2">
                  <button
                    onClick={() => setDisplayLimit((prev) => prev + 30)}
                    className={`px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold border transition-all active:scale-95 shadow-sm ${
                      isDark
                        ? 'bg-white/10 text-white hover:bg-white/15 border-white/20'
                        : 'bg-white text-stone-900 hover:bg-stone-50 border-stone-300'
                    }`}
                  >
                    Afficher 30 produits suivants ({filteredIngredients.length - displayLimit} restants)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ProductPreferencesView = React.memo(ProductPreferencesViewComponent);
