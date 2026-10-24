'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { 
  Dumbbell, 
  Flame, 
  DollarSign, 
  Scale, 
  Sparkles, 
  Check, 
  Search, 
  TrendingUp, 
  ExternalLink, 
  Zap, 
  HelpCircle, 
  Tag, 
  Filter, 
  Layers, 
  ArrowUpDown,
  ShoppingBag,
  Award,
  ChevronRight,
  Info
} from 'lucide-react';
import { Ingredient, MetroAisle, UserCustomizationSettings } from '@/types';
import { 
  calculateProteinEfficiency, 
  getCatalogProteinRankings, 
  RankedProteinItem, 
  ProteinEfficiencyResult 
} from '@/lib/protein-calculator';

interface ProteinEfficiencyCalculatorProps {
  customProducts?: Ingredient[];
  customPrices?: Record<string, number>;
  userSettings?: UserCustomizationSettings;
  isDark: boolean;
}

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'Tous les aliments' },
  { id: 'MEAT', label: 'Viandes & Volailles' },
  { id: 'DAIRY_EGGS', label: 'Produits Laitiers & Œufs' },
  { id: 'FISH', label: 'Poissons & Fruits de Mer' },
  { id: 'PLANT', label: 'Végétal & Féculents' },
  { id: 'CUSTOM', label: 'Ajoutés par Code-barres' },
];

const ProteinEfficiencyCalculatorComponent: React.FC<ProteinEfficiencyCalculatorProps> = ({
  customProducts = [],
  customPrices = {},
  userSettings,
  isDark,
}) => {
  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';
  const targetProtein = userSettings?.targetProtein ?? 165;

  // --- ÉTAT DU SIMULATEUR RAPIDE ---
  const [simName, setSimName] = useState('Poitrine de poulet club (Metro)');
  const [simPrice, setSimPrice] = useState('11.99');
  const [simAmount, setSimAmount] = useState('600');
  const [simUnit, setSimUnit] = useState<'g' | 'ml' | 'unite'>('g');
  const [simProteinPer100g, setSimProteinPer100g] = useState('26');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');

  // --- ÉTAT DU PALMARÈS DU CATALOGUE ---
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'cost_protein_asc' | 'protein_per_dollar_desc' | 'protein_pct_desc' | 'price_asc'>('cost_protein_asc');
  const [displayLimit, setDisplayLimit] = useState<number>(30);

  React.useEffect(() => {
    setDisplayLimit(30);
  }, [deferredSearch, categoryFilter, sortBy]);

  // Calcul du résultat du simulateur
  const simResult: ProteinEfficiencyResult = useMemo(() => {
    const priceNum = parseFloat(simPrice) || 0;
    const amountNum = parseFloat(simAmount) || 0;
    const protNum = parseFloat(simProteinPer100g) || 0;
    return calculateProteinEfficiency(priceNum, amountNum, simUnit, protNum);
  }, [simPrice, simAmount, simUnit, simProteinPer100g]);

  // Palmarès complet du catalogue
  const allRankedItems = useMemo(() => {
    return getCatalogProteinRankings(customProducts, customPrices);
  }, [customProducts, customPrices]);

  // Filtrage et tri du palmarès
  const filteredRankings = useMemo(() => {
    let list = allRankedItems;

    // Filtre de catégorie
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'MEAT') {
        list = list.filter((i) => i.aisle === 'BOUCHERIE_ET_POISSONNERIE' && !i.name.toLowerCase().includes('saumon') && !i.name.toLowerCase().includes('thon') && !i.name.toLowerCase().includes('crevette') && !i.name.toLowerCase().includes('morue'));
      } else if (categoryFilter === 'FISH') {
        list = list.filter((i) => i.name.toLowerCase().includes('saumon') || i.name.toLowerCase().includes('thon') || i.name.toLowerCase().includes('crevette') || i.name.toLowerCase().includes('morue') || i.name.toLowerCase().includes('poisson'));
      } else if (categoryFilter === 'DAIRY_EGGS') {
        list = list.filter((i) => i.aisle === 'PRODUITS_LAITIERS_ET_OEUFS' || i.name.toLowerCase().includes('oeuf'));
      } else if (categoryFilter === 'PLANT') {
        list = list.filter((i) => i.aisle === 'EPICERIE' || i.aisle === 'FRUITS_ET_LEGUMES' || i.aisle === 'BOULANGERIE');
      } else if (categoryFilter === 'CUSTOM') {
        list = list.filter((i) => i.isCustom || i.barcode);
      }
    }

    // Filtre de recherche texte
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase().trim();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.packageLabel.toLowerCase().includes(q) || (i.barcode && i.barcode.includes(q))
      );
    }

    // Tri
    return [...list].sort((a, b) => {
      if (sortBy === 'cost_protein_asc') {
        return a.result.costPer100gProtein - b.result.costPer100gProtein;
      }
      if (sortBy === 'protein_per_dollar_desc') {
        return b.result.proteinPerDollar - a.result.proteinPerDollar;
      }
      if (sortBy === 'protein_pct_desc') {
        return b.proteinPer100g - a.proteinPer100g;
      }
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      }
      return 0;
    });
  }, [allRankedItems, categoryFilter, searchQuery, sortBy]);

  // Charger un produit du catalogue dans le simulateur
  const handleLoadProductIntoSimulator = (item: RankedProteinItem) => {
    setSelectedPresetId(item.id);
    setSimName(item.name);
    setSimPrice(item.price.toFixed(2));
    setSimAmount(item.packageAmount.toString());
    setSimUnit((item.packageUnit as any) || 'g');
    setSimProteinPer100g(item.proteinPer100g.toString());
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner Explicatif */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 border transition-all ${cardGlassClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                Optimisation Épicerie & Fitness
              </span>
              <span className="text-stone-400 text-xs">•</span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                Marché Québécois Metro
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Calculateur de <span className="italic">Rentabilité Protéique</span>
            </h1>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed font-sans">
              Tous les aliments riches en protéines ne se valent pas sur la facture. Ce ratio calcule le 
              <strong> coût exact en dollars pour 100g de protéine pure ($ / 100g P)</strong>. 
              Plus le chiffre est bas, plus chaque dollar dépensé à l'épicerie construit du muscle sans vider votre compte.
            </p>
          </div>

          {/* Pastille Objectif Actuel */}
          <div className="shrink-0 p-4 rounded-2xl border border-stone-200/80 dark:border-white/10 bg-stone-100/60 dark:bg-white/[0.03] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center font-bold">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Votre cible quotidienne
              </div>
              <div className="font-mono text-xl font-bold text-stone-900 dark:text-white tabular-nums">
                {targetProtein}g <span className="text-xs font-normal text-stone-400">protéines / jour</span>
              </div>
              <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                Estimations personnalisées actives
              </div>
            </div>
          </div>
        </div>

        {/* Échelle des 4 Paliers de Rentabilité */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-8 pt-6 border-t border-stone-200/60 dark:border-white/10">
          <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                &lt; 4.00 $ / 100g P
              </span>
              <span className="text-xs">💎</span>
            </div>
            <div className="font-serif text-sm font-medium text-emerald-900 dark:text-emerald-200 mt-1">
              Aubaine Ultime
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-0.5 leading-snug">
              Tofu, whey en gros spécial, thon en promo, poulet club.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 dark:bg-sky-500/15">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-sky-800 dark:text-sky-300">
                4.00 $ - 6.50 $ / 100g P
              </span>
              <span className="text-xs">🟢</span>
            </div>
            <div className="font-serif text-sm font-medium text-sky-900 dark:text-sky-200 mt-1">
              Très Bon Rapport
            </div>
            <div className="text-[11px] text-sky-700 dark:text-sky-300/80 mt-0.5 leading-snug">
              Poulet régulier, œufs, fromage cottage, yogourt grec.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/15">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300">
                6.50 $ - 9.50 $ / 100g P
              </span>
              <span className="text-xs">🟡</span>
            </div>
            <div className="font-serif text-sm font-medium text-amber-900 dark:text-amber-200 mt-1">
              Rapport Modéré
            </div>
            <div className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5 leading-snug">
              Bœuf haché maigre, saumon régulier, fromages affinés.
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/15">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-rose-800 dark:text-rose-300">
                &gt; 9.50 $ / 100g P
              </span>
              <span className="text-xs">🔴</span>
            </div>
            <div className="font-serif text-sm font-medium text-rose-900 dark:text-rose-200 mt-1">
              Protéine Coûteuse
            </div>
            <div className="text-[11px] text-rose-700 dark:text-rose-300/80 mt-0.5 leading-snug">
              Steaks nobles, crevettes, charcuteries, barres chères.
            </div>
          </div>
        </div>
      </div>

      {/* 2. Simulateur Interactif en Direct */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 border transition-all ${cardGlassClass}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white dark:bg-white dark:text-stone-950 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                Simulateur en Direct
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Entrez le prix et les macros d'un article en magasin ou choisissez un produit pour le tester
              </p>
            </div>
          </div>

          {/* Sélecteur rapide de preset */}
          <div className="hidden sm:block">
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const found = allRankedItems.find((i) => i.id === e.target.value);
                if (found) {
                  handleLoadProductIntoSimulator(found);
                } else {
                  setSelectedPresetId('custom');
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-xl border font-mono transition-all outline-hidden ${
                isDark
                  ? 'bg-black/50 border-white/10 text-stone-200 focus:border-white/30'
                  : 'bg-white border-stone-200 text-stone-800 focus:border-stone-400'
              }`}
            >
              <option value="custom">-- Choisir un produit du catalogue --</option>
              {allRankedItems.slice(0, 30).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.price.toFixed(2)}$ • {item.result.costPer100gProtein.toFixed(2)}$/100g P)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Formulaire Inputs */}
          <div className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
                Nom du Produit ou Format
              </label>
              <input
                type="text"
                value={simName}
                onChange={(e) => {
                  setSimName(e.target.value);
                  setSelectedPresetId('custom');
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-sans transition-all outline-hidden ${
                  isDark
                    ? 'bg-black/40 border-white/10 text-white focus:border-white/30'
                    : 'bg-white border-stone-200 text-stone-900 focus:border-stone-400'
                }`}
                placeholder="Ex: Barilla Spaghetti 454g"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Prix */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Prix ($ CAD)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.10"
                    value={simPrice}
                    onChange={(e) => {
                      setSimPrice(e.target.value);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono text-sm font-semibold transition-all outline-hidden ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-white focus:border-white/30'
                        : 'bg-white border-stone-200 text-stone-900 focus:border-stone-400'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-mono pointer-events-none">$</span>
                </div>
              </div>

              {/* Quantité du paquet */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Quantité
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={simAmount}
                    onChange={(e) => {
                      setSimAmount(e.target.value);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono text-sm font-semibold transition-all outline-hidden ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-white focus:border-white/30'
                        : 'bg-white border-stone-200 text-stone-900 focus:border-stone-400'
                    }`}
                  />
                  <select
                    value={simUnit}
                    onChange={(e) => {
                      setSimUnit(e.target.value as any);
                      setSelectedPresetId('custom');
                    }}
                    className={`px-2 py-2.5 rounded-xl border text-xs font-mono transition-all outline-hidden ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-stone-300'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                    <option value="unite">un.</option>
                  </select>
                </div>
              </div>

              {/* Protéines pour 100g */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" /> Prot / 100g
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={simProteinPer100g}
                    onChange={(e) => {
                      setSimProteinPer100g(e.target.value);
                      setSelectedPresetId('custom');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl border font-mono text-sm font-semibold transition-all outline-hidden ${
                      isDark
                        ? 'bg-black/40 border-white/10 text-white focus:border-white/30'
                        : 'bg-white border-stone-200 text-stone-900 focus:border-stone-400'
                    }`}
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-mono pointer-events-none">g</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-stone-400 font-mono">Presets populaires :</span>
              <button
                type="button"
                onClick={() => {
                  setSimName('Poitrine de poulet club (Metro)');
                  setSimPrice('11.99');
                  setSimAmount('600');
                  setSimUnit('g');
                  setSimProteinPer100g('26');
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg border border-stone-200 dark:border-white/10 hover:border-stone-400 text-stone-600 dark:text-stone-300 transition-colors"
              >
                Poulet club 600g
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimName('12 Gros œufs Sélection');
                  setSimPrice('4.19');
                  setSimAmount('12');
                  setSimUnit('unite');
                  setSimProteinPer100g('12.6');
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg border border-stone-200 dark:border-white/10 hover:border-stone-400 text-stone-600 dark:text-stone-300 transition-colors"
              >
                12 Œufs
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimName('Thon blanc en conserve (égoutté)');
                  setSimPrice('1.69');
                  setSimAmount('120');
                  setSimUnit('g');
                  setSimProteinPer100g('25');
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg border border-stone-200 dark:border-white/10 hover:border-stone-400 text-stone-600 dark:text-stone-300 transition-colors"
              >
                Thon (120g égoutté)
              </button>
              <button
                type="button"
                onClick={() => {
                  setSimName('Yogourt grec 0% 750g');
                  setSimPrice('5.49');
                  setSimAmount('750');
                  setSimUnit('g');
                  setSimProteinPer100g('10.3');
                }}
                className="text-[11px] px-2 py-0.5 rounded-lg border border-stone-200 dark:border-white/10 hover:border-stone-400 text-stone-600 dark:text-stone-300 transition-colors"
              >
                Yogourt grec 750g
              </button>
            </div>

            {/* Note Précision : Poids Égoutté */}
            <div className="p-3 rounded-xl bg-stone-100/60 dark:bg-white/[0.02] border border-stone-200/60 dark:border-white/5 text-[11px] text-stone-500 dark:text-stone-400 leading-snug flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
              <span>
                <strong>Précision Poids Égoutté :</strong> Pour les poissons en conserve (thon, saumon) et légumineuses, le calculateur prend en compte le poids réel égoutté (ex: 1 boîte de thon de 170g donne 120g net de chair, soit 30g de protéines pures) afin de ne pas fausser le ratio en comptabilisant l'eau de bouillon.
              </span>
            </div>
          </div>

          {/* Carte Résultat / Verdict Instantané */}
          <div className="lg:col-span-6 flex flex-col justify-between p-6 rounded-2xl border transition-all border-stone-200 dark:border-white/10 bg-stone-50/70 dark:bg-black/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Verdict de Rentabilité
                </span>
                <span
                  className={`text-xs font-mono uppercase px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1.5 ${simResult.tierColorClass.badge}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${simResult.tierColorClass.dot}`} />
                  {simResult.tierLabel}
                </span>
              </div>

              {/* Gros Chiffre Ratio Clé */}
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-4xl sm:text-5xl font-light text-stone-950 dark:text-white tabular-nums tracking-tight">
                    {simResult.costPer100gProtein.toFixed(2)} $
                  </span>
                  <span className="font-mono text-sm sm:text-base text-stone-500 dark:text-stone-400 font-medium">
                    / 100g de protéine pure
                  </span>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 font-sans leading-relaxed">
                  {simResult.advice}
                </p>
              </div>

              {/* Métriques Secondaires */}
              <div className="grid grid-cols-3 gap-2 mt-5 p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-stone-200/60 dark:border-white/5 text-center font-mono">
                <div>
                  <div className="text-[10px] text-stone-400 uppercase">Protéines / $</div>
                  <div className="text-sm font-bold text-stone-900 dark:text-white tabular-nums mt-0.5">
                    {simResult.proteinPerDollar}g <span className="text-[10px] font-normal text-stone-400">/ $</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400 uppercase">Total Paquet</div>
                  <div className="text-sm font-bold text-stone-900 dark:text-white tabular-nums mt-0.5">
                    {simResult.totalProteinGrams}g <span className="text-[10px] font-normal text-stone-400">prot</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-stone-400 uppercase">Coût / 1g</div>
                  <div className="text-sm font-bold text-stone-900 dark:text-white tabular-nums mt-0.5">
                    {simResult.costPerGramProtein.toFixed(3)} $
                  </div>
                </div>
              </div>
            </div>

            {/* Benchmark Quotidien */}
            <div className="mt-5 pt-4 border-t border-stone-200/60 dark:border-white/10 flex items-center justify-between text-xs font-mono">
              <span className="text-stone-500 dark:text-stone-400">
                Coût pour votre cible ({targetProtein}g P / jour) :
              </span>
              <span className="font-bold text-stone-900 dark:text-white text-sm tabular-nums">
                {simResult.dailyCostForTarget(targetProtein).toFixed(2)} $ CAD / jour
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Le Palmarès du Catalogue (Leaderboard de Rentabilité Protéique) */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 border transition-all ${cardGlassClass}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="font-serif text-2xl font-normal text-stone-900 dark:text-white">
                Palmarès de Rentabilité Protéique du Catalogue
              </h2>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Classement en direct de tous les aliments Metro et de vos produits scannés, du plus économique au plus dispendieux
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-stone-400">
            <span>{filteredRankings.length} produits classés</span>
          </div>
        </div>

        {/* Barre de Recherche, Filtres de Catégories et Tri */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Barre de Recherche */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une viande, œuf, yogourt, poisson, code-barres..."
                className={`w-full pl-9.5 pr-4 py-2 rounded-2xl border text-xs transition-all outline-hidden ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 text-white placeholder-stone-500 focus:border-white/30'
                    : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400 focus:border-stone-400 shadow-xs'
                }`}
              />
            </div>

            {/* Sélecteur de Tri */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-stone-400 font-mono flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" /> Tri :
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`text-xs px-3 py-2 rounded-2xl border font-mono transition-all outline-hidden ${
                  isDark
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-white border-stone-200 text-stone-900 shadow-xs'
                }`}
              >
                <option value="cost_protein_asc">Rentabilité ($ / 100g P croissant)</option>
                <option value="protein_per_dollar_desc">Protéines par dollar (g P / $)</option>
                <option value="protein_pct_desc">Teneur en protéine (% / 100g)</option>
                <option value="price_asc">Prix du paquet ($ croissant)</option>
              </select>
            </div>
          </div>

          {/* Filtres de Catégorie */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? isDark
                        ? 'bg-white text-stone-950 font-semibold shadow-md'
                        : 'bg-stone-900 text-white font-semibold shadow-sm'
                      : isDark
                      ? 'bg-white/[0.03] text-stone-400 hover:text-white border border-white/5'
                      : 'bg-white text-stone-700 hover:text-stone-950 border border-stone-200 shadow-xs'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille des Cartes du Palmarès */}
        {filteredRankings.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-stone-500 text-xs font-mono uppercase tracking-wider">
              Aucun aliment riche en protéines trouvé pour cette recherche
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredRankings.slice(0, displayLimit).map((item, index) => {
                const res = item.result;
                const isTop3 = index < 3 && categoryFilter === 'ALL' && sortBy === 'cost_protein_asc';

                return (
                  <div
                    key={item.id}
                    className={`p-4.5 rounded-3xl border transition-all flex flex-col justify-between relative group ${
                      isTop3
                        ? isDark
                          ? 'bg-white/[0.05] border-amber-500/30 ring-1 ring-amber-500/20'
                          : 'bg-white border-amber-400/80 ring-1 ring-amber-400/30 shadow-md'
                        : isDark
                        ? 'bg-white/[0.02] border-white/5 hover:border-white/20'
                        : 'bg-white border-stone-200/90 hover:border-stone-300 shadow-xs'
                    }`}
                  >
                    <div>
                      {/* En-tête : Rang + Badge de Rentabilité */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                              index === 0
                                ? 'bg-amber-400 text-stone-950'
                                : index === 1
                                ? 'bg-stone-300 text-stone-900'
                                : index === 2
                                ? 'bg-amber-700 text-white'
                                : isDark
                                ? 'bg-white/10 text-stone-400'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            #{index + 1}
                          </span>

                          {item.barcode && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                              Code-barres
                            </span>
                          )}

                          {item.isCustomPrice && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-stone-900 text-white dark:bg-white dark:text-stone-950 font-semibold">
                              Prix Custom
                            </span>
                          )}

                          {item.isMoiPrice && (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-white/20 font-semibold">
                              Moi
                            </span>
                          )}
                        </div>

                        {/* Badge Verdict Tier */}
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-semibold ${res.tierColorClass.badge}`}
                        >
                          {res.tierLabel}
                        </span>
                      </div>

                      {/* Contenu Produit */}
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
                          <h3 className="font-serif text-sm font-medium text-stone-900 dark:text-white leading-snug line-clamp-2">
                            {item.name}
                          </h3>
                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 font-sans">
                            {item.packageLabel} • <span className="font-mono font-semibold text-stone-900 dark:text-white">{item.price.toFixed(2)} $</span>
                          </div>
                        </div>
                      </div>

                      {/* Bloc Rentabilité Protéique (Focal Point) */}
                      <div className="mt-3.5 p-2.5 rounded-2xl bg-stone-100/70 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/10 flex items-center justify-between">
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wider text-stone-400">
                            Coût Protéine Pure
                          </div>
                          <div className="font-mono text-base font-bold text-stone-900 dark:text-white tabular-nums">
                            {res.costPer100gProtein.toFixed(2)} ${' '}
                            <span className="text-[10px] font-normal text-stone-400">/ 100g P</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-stone-400">
                            Généré par Dollar
                          </div>
                          <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {res.proteinPerDollar}g{' '}
                            <span className="text-[10px] font-normal text-stone-400">/ 1$</span>
                          </div>
                        </div>
                      </div>

                      {/* Teneur en protéines et total paquet */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2 font-mono text-[11px] text-stone-600 dark:text-stone-400">
                        <div>
                          Teneur : <span className="font-semibold text-stone-900 dark:text-white">{item.proteinPer100g}g</span> / 100g
                        </div>
                        <div className="text-right">
                          Total : <span className="font-semibold text-stone-900 dark:text-white">{res.totalProteinGrams}g</span> prot
                        </div>
                      </div>
                    </div>

                    {/* Actions Rapides */}
                    <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-white/10 flex items-center justify-between">
                      <button
                        onClick={() => handleLoadProductIntoSimulator(item)}
                        className="text-xs font-mono font-medium text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white flex items-center gap-1 transition-colors"
                        title="Tester et ajuster dans le simulateur en direct ci-dessus"
                      >
                        <Zap className="w-3 h-3" /> Charger dans le simulateur
                      </button>

                      {item.metroProductUrl && (
                        <a
                          href={item.metroProductUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors p-1"
                          title="Fiche produit Metro.ca"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bouton Rendu Progressif */}
            {displayLimit < filteredRankings.length && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  onClick={() => setDisplayLimit((prev) => prev + 30)}
                  className={`px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold border transition-all active:scale-95 shadow-sm ${
                    isDark
                      ? 'bg-white/10 text-white hover:bg-white/15 border-white/20'
                      : 'bg-white text-stone-900 hover:bg-stone-50 border-stone-300'
                  }`}
                >
                  Afficher 30 aliments suivants ({filteredRankings.length - displayLimit} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ProteinEfficiencyCalculator = React.memo(ProteinEfficiencyCalculatorComponent);
