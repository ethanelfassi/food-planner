'use client';

import React, { useState } from 'react';
import { 
  ScanBarcode, 
  Search, 
  Check, 
  X, 
  Flame, 
  Dumbbell, 
  Wheat, 
  Droplet, 
  DollarSign, 
  Package, 
  Store, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Ingredient, MetroAisle } from '@/types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: (product: Ingredient) => void;
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

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductAdded,
  isDark,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundProduct, setFoundProduct] = useState<Partial<Ingredient> | null>(null);
  
  // Champs modifiables du produit trouvé
  const [name, setName] = useState('');
  const [aisle, setAisle] = useState<MetroAisle>('EPICERIE');
  const [price, setPrice] = useState('3.99');
  const [amount, setAmount] = useState('454');
  const [unit, setUnit] = useState('g');
  const [calories, setCalories] = useState('0');
  const [protein, setProtein] = useState('0');
  const [carbs, setCarbs] = useState('0');
  const [fat, setFat] = useState('0');
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = barcodeInput.replace(/\D/g, '').trim();
    if (cleanCode.length < 8) {
      setError('Veuillez entrer un code-barres valide (8 à 14 chiffres)');
      return;
    }

    setLoading(true);
    setError(null);
    setFoundProduct(null);
    setSuccessNotice(false);

    try {
      const res = await fetch(`/api/barcode?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Produit non trouvé. Vérifiez les chiffres sur l’emballage.');
        setLoading(false);
        return;
      }

      const p = data.product;
      setFoundProduct(p);
      setName(p.name || '');
      setAisle((p.aisle as MetroAisle) || 'EPICERIE');
      setPrice(String(p.packaging?.exactPriceMetro ?? 3.99));
      setAmount(String(p.packaging?.amount ?? 454));
      setUnit(p.packaging?.unit ?? 'g');
      setCalories(String(p.macrosPer100g?.calories ?? 0));
      setProtein(String(p.macrosPer100g?.protein ?? 0));
      setCarbs(String(p.macrosPer100g?.carbs ?? 0));
      setFat(String(p.macrosPer100g?.fat ?? 0));
    } catch (err: any) {
      setError('Impossible de joindre la base de données code-barres: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Le nom du produit est requis.');
      return;
    }

    setSaving(true);
    setError(null);

    const numAmount = Math.max(1, parseFloat(amount) || 100);
    const numPrice = Math.max(0, parseFloat(price) || 0);
    const unitPricePer100 = Math.round((numPrice / (numAmount / 100)) * 100) / 100;

    const productPayload: Partial<Ingredient> = {
      id: foundProduct?.barcode ? `barcode_${foundProduct.barcode}` : `custom_prod_${Date.now()}`,
      name: name.trim(),
      aisle,
      baseUnit: unit === 'ml' ? 'ml' : 'g',
      packaging: {
        amount: numAmount,
        unit,
        label: `${numAmount} ${unit}`,
        regularPriceMetro: numPrice,
        exactPriceMetro: numPrice,
        unitPricePer100g: unitPricePer100,
        unitPriceLabel: `${numPrice} $ / emballage`,
        priceMaxi: numPrice,
        priceSuperC: numPrice,
        priceIGA: numPrice,
        isTaxable: false,
        isMoiMemberPrice: false,
      },
      imageUrl: foundProduct?.imageUrl,
      metroProductUrl: foundProduct?.metroProductUrl || `https://www.metro.ca/recherche?free-text=${encodeURIComponent(name.trim())}`,
      barcode: foundProduct?.barcode || barcodeInput.replace(/\D/g, '').trim(),
      isCustom: true,
      macrosPer100g: {
        calories: Math.max(0, Math.round(parseFloat(calories) || 0)),
        protein: Math.max(0, Math.round((parseFloat(protein) || 0) * 10) / 10),
        carbs: Math.max(0, Math.round((parseFloat(carbs) || 0) * 10) / 10),
        fat: Math.max(0, Math.round((parseFloat(fat) || 0) * 10) / 10),
      },
    };

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde du produit');
      }

      setSuccessNotice(true);
      onProductAdded(data.product);

      // Fermeture après confirmation visuelle
      setTimeout(() => {
        setBarcodeInput('');
        setFoundProduct(null);
        setSuccessNotice(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200 mb-safe sm:mb-0">
      <div
        className={`w-full max-w-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] transition-all ${
          isDark
            ? 'bg-stone-950/95 border-white/10 text-white'
            : 'bg-white/95 border-stone-200 text-stone-900 shadow-2xl'
        }`}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-stone-200/80 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/10 text-white' : 'bg-stone-900 text-white'}`}>
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-medium">Ajouter un produit via Code-barres</h2>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Recherche automatique des macros et infos officielles (Metro QC / Open Food Facts)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Formulaire de saisie du code-barres */}
          <form onSubmit={handleLookup} className="space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Code-barres (12 ou 13 chiffres de l'emballage)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="ex: 076808011012 (Barilla) ou 059749896078 (Selection)"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    if (error) setError(null);
                  }}
                  className={`w-full pl-3.5 pr-10 py-2.5 rounded-2xl text-sm font-mono border focus:outline-none focus:ring-2 focus:ring-stone-500 transition-all ${
                    isDark
                      ? 'bg-black/50 border-white/15 text-white placeholder-stone-600'
                      : 'bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400'
                  }`}
                  autoFocus
                />
                <ScanBarcode className="absolute right-3.5 top-3 w-4 h-4 text-stone-400" />
              </div>
              <button
                type="submit"
                disabled={loading || !barcodeInput.trim()}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-medium font-mono uppercase tracking-wider transition-all disabled:opacity-50 shrink-0 ${
                  isDark
                    ? 'bg-white text-stone-950 hover:bg-stone-200 font-semibold shadow-md active:scale-95'
                    : 'bg-stone-950 text-white hover:bg-stone-800 font-semibold shadow-sm active:scale-95'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Trouver</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggestions rapides testées */}
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 flex-wrap">
              <span>Exemples :</span>
              <button
                type="button"
                onClick={() => { setBarcodeInput('076808011012'); }}
                className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
              >
                Pâtes Barilla
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setBarcodeInput('059749896078'); }}
                className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
              >
                Œufs Selection
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => { setBarcodeInput('068100084665'); }}
                className="underline hover:text-stone-900 dark:hover:text-stone-200 font-mono"
              >
                Beurre d'arachide Kraft
              </button>
            </div>
          </form>

          {/* Erreur si non trouvé */}
          {error && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isDark ? 'bg-red-950/40 border-red-800/40 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div className="text-xs">
                <p className="font-semibold">{error}</p>
                <p className="mt-1 opacity-80 text-[11px]">
                  Assurez-vous de saisir tous les chiffres sous le code-barres (souvent 12 chiffres au Canada).
                </p>
              </div>
            </div>
          )}

          {/* Succès Feedback */}
          {successNotice && (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDark ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-xs font-semibold">Produit ajouté avec succès à votre catalogue !</span>
            </div>
          )}

          {/* Carte Fiche Produit Détectée */}
          {foundProduct && (
            <div
              className={`p-5 rounded-3xl border space-y-5 animate-in fade-in duration-200 ${
                isDark
                  ? 'bg-white/[0.03] border-white/10'
                  : 'bg-stone-50 border-stone-200 shadow-xs'
              }`}
            >
              {/* Entête Détection */}
              <div className="flex gap-4 items-start">
                {foundProduct.imageUrl ? (
                  <img
                    src={foundProduct.imageUrl}
                    alt={name}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-white p-1 border border-stone-200 dark:border-white/10 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border shrink-0 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-stone-200 border-stone-300'
                  }`}>
                    <Package className="w-8 h-8 text-stone-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                      Code-barres vérifié : {foundProduct.barcode}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom du produit"
                    className={`w-full font-serif text-base font-semibold px-2.5 py-1 rounded-xl border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                      isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  />
                  <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 pt-1">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Store className="w-3.5 h-3.5" /> Metro ÉTS
                    </span>
                    {foundProduct.metroProductUrl && (
                      <a
                        href={foundProduct.metroProductUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] underline hover:text-stone-900 dark:hover:text-white"
                      >
                        Voir sur Metro <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Capsules Macros / 100g */}
              <div className="space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 font-semibold block">
                  Valeurs nutritives certifiées (par 100 g / ml)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Flame className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
                      <span>Calories</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">kcal</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Dumbbell className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                      <span>Protéines</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Wheat className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                      <span>Glucides</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>

                  <div className={`p-3 rounded-2xl border flex flex-col items-center justify-center ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 mb-1">
                      <Droplet className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                      <span>Lipides</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        step="0.1"
                        value={fat}
                        onChange={(e) => setFat(e.target.value)}
                        className="w-14 text-center font-mono font-bold text-base bg-transparent border-b border-dashed border-stone-400 focus:outline-none"
                      />
                      <span className="text-[10px] text-stone-400 font-mono">g</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rayon, Quantité et Prix Metro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Rayon / Allée
                  </label>
                  <select
                    value={aisle}
                    onChange={(e) => setAisle(e.target.value as MetroAisle)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                      isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                    }`}
                  >
                    {AISLE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className={isDark ? 'bg-stone-900' : 'bg-white'}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Poids emballage ({unit})
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="454"
                      className={`w-full px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className={`px-2 py-2 rounded-xl text-xs border font-mono ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="unite">unité</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-stone-500 dark:text-stone-400 mb-1">
                    Prix Metro ($)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="3.99"
                      className={`w-full pl-7 pr-3 py-2 rounded-xl text-xs border font-mono focus:outline-none focus:ring-1 focus:ring-stone-500 ${
                        isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
                      }`}
                    />
                    <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200/80 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
          >
            Annuler
          </button>

          {foundProduct && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-xs font-mono uppercase tracking-wider font-semibold transition-all active:scale-95 shadow-md ${
                isDark
                  ? 'bg-white text-stone-950 hover:bg-stone-200'
                  : 'bg-stone-950 text-white hover:bg-stone-800'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Ajouter au catalogue</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
