'use client';

import React, { useState } from 'react';
import { 
  Package, 
  X, 
  Check, 
  Flame, 
  Dumbbell, 
  Wheat, 
  Droplet, 
  DollarSign, 
  Store, 
  Sparkles,
  Barcode
} from 'lucide-react';
import { Ingredient, MetroAisle } from '@/types';

interface ProductCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: Ingredient) => void;
  isDark: boolean;
}

const AISLE_OPTIONS: { id: MetroAisle; label: string }[] = [
  { id: 'EPICERIE', label: 'Garde-manger & Épicerie' },
  { id: 'PRODUITS_LAITIERS_ET_OEUFS', label: 'Produits Laitiers & Œufs' },
  { id: 'BOUCHERIE_ET_POISSONNERIE', label: 'Boucherie & Poissonnerie' },
  { id: 'BOULANGERIE', label: 'Boulangerie & Pains' },
  { id: 'FRUITS_ET_LEGUMES', label: 'Fruits & Légumes' },
  { id: 'SURGELES', label: 'Surgelés' },
  { id: 'DIVERS', label: 'Divers' },
];

export const ProductCreatorModal: React.FC<ProductCreatorModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  isDark,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [aisle, setAisle] = useState<MetroAisle>('EPICERIE');
  const [amount, setAmount] = useState('454');
  const [unit, setUnit] = useState('g');
  const [price, setPrice] = useState('4.99');
  const [isTaxable, setIsTaxable] = useState(false);
  const [calories, setCalories] = useState('150');
  const [protein, setProtein] = useState('10');
  const [carbs, setCarbs] = useState('5');
  const [fat, setFat] = useState('2');
  const [barcode, setBarcode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Veuillez renseigner le nom de l'aliment");
      return;
    }

    const parsedPrice = parseFloat(price.replace(',', '.')) || 0;
    const parsedAmount = parseFloat(amount.replace(',', '.')) || 100;
    const parsedCals = parseInt(calories, 10) || 0;
    const parsedProt = parseFloat(protein.replace(',', '.')) || 0;
    const parsedCarbs = parseFloat(carbs.replace(',', '.')) || 0;
    const parsedFat = parseFloat(fat.replace(',', '.')) || 0;

    const fullName = brand.trim() ? `${name.trim()} (${brand.trim()})` : name.trim();
    const cleanBarcode = barcode.replace(/\D/g, '').trim();

    setSaving(true);
    setError(null);

    const payload: Partial<Ingredient> = {
      name: fullName,
      aisle,
      baseUnit: unit === 'ml' ? 'ml' : 'g',
      barcode: cleanBarcode || undefined,
      isCustom: true,
      packaging: {
        amount: parsedAmount,
        unit,
        label: `${parsedAmount} ${unit}`,
        regularPriceMetro: parsedPrice,
        exactPriceMetro: parsedPrice,
        unitPricePer100g: parsedAmount > 0 ? Math.round((parsedPrice / (parsedAmount / 100)) * 100) / 100 : 0,
        unitPriceLabel: parsedAmount > 0 ? `${(parsedPrice / (parsedAmount / 100)).toFixed(2)} $ / 100${unit}` : '',
        priceMaxi: Math.round(parsedPrice * 0.95 * 100) / 100,
        priceSuperC: Math.round(parsedPrice * 0.93 * 100) / 100,
        priceIGA: Math.round(parsedPrice * 1.05 * 100) / 100,
        isTaxable,
        isMoiMemberPrice: false,
      },
      macrosPer100g: {
        calories: parsedCals,
        protein: parsedProt,
        carbs: parsedCarbs,
        fat: parsedFat,
      },
      metroProductUrl: `https://www.metro.ca/recherche?free-text=${encodeURIComponent(fullName)}`,
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Erreur lors de l'enregistrement SQLite");
        setSaving(false);
        return;
      }

      onProductCreated(data.product);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 animate-in fade-in duration-150 mb-safe sm:mb-0">
      <div
        className={`w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-7 border shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto ${
          isDark ? 'bg-stone-950 border-white/15 text-white' : 'bg-white border-stone-200 text-stone-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <h3 className="font-serif text-xl sm:text-2xl font-normal">
              Ajouter un <span className="italic">aliment manuel</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom & Marque */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Nom de l'aliment *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Poulet mariné souvlaki"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Marque (optionnel)
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ex: Maison"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              />
            </div>
          </div>

          {/* Rayon & Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Rayon Metro
              </label>
              <select
                value={aisle}
                onChange={(e) => setAisle(e.target.value as MetroAisle)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-stone-900 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              >
                {AISLE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Prix d'achat ($ CAD)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  max="999.00"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-xl text-sm font-mono tabular-nums border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400">
                  $ CAD
                </span>
              </div>
            </div>
          </div>

          {/* Format & Unité */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Quantité paquet
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Unité
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-stone-900 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              >
                <option value="g">Grammes (g)</option>
                <option value="ml">Millilitres (ml)</option>
                <option value="unite">Unité / Pièce</option>
                <option value="tranche">Tranches</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1 space-y-1">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                Code-barres (opt)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Facultatif"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono border focus:outline-none focus:ring-1 focus:ring-stone-400 ${
                  isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-stone-50 border-stone-300 text-stone-900'
                }`}
              />
            </div>
          </div>

          {/* Macronutriments pour 100g */}
          <div className="p-4 rounded-2xl border bg-stone-500/5 border-stone-300/60 dark:border-white/10 space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-stone-600 dark:text-stone-300 font-semibold block">
              Macronutriments officiels pour 100g (ou 100ml)
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Flame className="w-3 h-3 text-amber-500" /> Calories
                </label>
                <input
                  type="number"
                  min="0"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono tabular-nums border text-center ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Dumbbell className="w-3 h-3 text-blue-500" /> Protéines (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono tabular-nums border text-center ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Wheat className="w-3 h-3 text-amber-600" /> Glucides (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono tabular-nums border text-center ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-1 font-semibold">
                  <Droplet className="w-3 h-3 text-emerald-500" /> Lipides (g)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-sm font-mono tabular-nums border text-center ${
                    isDark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-stone-300 text-stone-900'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/60 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold transition-all shadow-md active:scale-95 ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200'
                  : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Ajouter au catalogue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
