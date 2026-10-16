'use client';

import React, { useState } from 'react';
import { CoupleSettings, GroceryItem, MetroAisle, SplitCostReport } from '@/types';
import { AISLE_LABELS, calculateReceiptTaxes } from '@/lib/grocery';
import { 
  formatGroceryListAsText, 
  generateMailtoUrl, 
  downloadGroceryListFile 
} from '@/lib/export';
import { 
  Check, 
  Copy, 
  Download, 
  Mail, 
  Plus, 
  Trash2, 
  ShoppingBag, 
  ExternalLink, 
  Users, 
  Receipt, 
  Crown,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';

interface GroceryListViewProps {
  items: GroceryItem[];
  coupleSettings: CoupleSettings;
  splitReport: SplitCostReport;
  isDark: boolean;
  onToggleItem: (id: string) => void;
  onAddItem: (name: string, aisle: MetroAisle, packageDescription: string, isTaxable: boolean, price: number) => void;
  onRemoveItem: (id: string) => void;
  onClearChecked: () => void;
  onToggleCoupleMode: () => void;
}

export const GroceryListView: React.FC<GroceryListViewProps> = ({
  items,
  coupleSettings,
  splitReport,
  isDark,
  onToggleItem,
  onAddItem,
  onRemoveItem,
  onClearChecked,
  onToggleCoupleMode,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAisle, setNewItemAisle] = useState<MetroAisle>('EPICERIE');
  const [newItemPack, setNewItemPack] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemTaxable, setNewItemTaxable] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const receipt = calculateReceiptTaxes(items);
  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;

  const visibleItems = items.filter((i) => {
    if (filterMode === 'pending') return !i.checked;
    if (filterMode === 'completed') return i.checked;
    return true;
  });

  const grouped: Record<string, GroceryItem[]> = {};
  for (const item of visibleItems) {
    if (!grouped[item.aisle]) grouped[item.aisle] = [];
    grouped[item.aisle].push(item);
  }

  const sortedAisles = Object.keys(grouped).sort((a, b) => {
    const orderA = AISLE_LABELS[a as MetroAisle]?.order ?? 99;
    const orderB = AISLE_LABELS[b as MetroAisle]?.order ?? 99;
    return orderA - orderB;
  });

  const handleCopyClipboard = async () => {
    const text = formatGroceryListAsText(items, 'Metro');
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch {
      alert('Impossible de copier automatiquement.');
    }
  };

  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const parsedPrice = parseFloat(newItemPrice) || 0;
    onAddItem(newItemName.trim(), newItemAisle, newItemPack.trim() || '1 unité', newItemTaxable, parsedPrice);
    setNewItemName('');
    setNewItemPack('');
    setNewItemPrice('');
    setNewItemTaxable(false);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* TICKET DE CAISSE FISCAL EXACT (Liquid Glass Apple Receipt Style) */}
      <div
        className={`rounded-3xl p-6 sm:p-8 transition-all relative overflow-hidden border ${
          isDark
            ? 'liquid-glass border-emerald-500/30'
            : 'liquid-glass-light border-emerald-800/20'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1.5">
                <Receipt className="w-3 h-3" /> Reçu Fiscal Metro QC
              </span>
              <span className="font-mono text-xs text-stone-400">
                {checkedItems} / {totalItems} cochés
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Liste d'Épicerie & <span className="italic">Ticket Exact</span>
            </h1>

            <div className="flex items-baseline gap-3 mt-3">
              <span className="font-mono tabular-nums text-4xl sm:text-5xl font-light tracking-tight text-stone-900 dark:text-white">
                {receipt.totalWithTax.toFixed(2)}
              </span>
              <span className="font-mono text-lg text-emerald-600 dark:text-emerald-400 font-normal">
                $ CAD
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                (Montant exact payable en caisse)
              </span>
            </div>

            {receipt.totalSavingsMoi > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-mono">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span>Rabais Membre Moi & Promos : -{receipt.totalSavingsMoi.toFixed(2)} $</span>
                <span className="text-stone-400 line-through text-[11px]">
                  ({receipt.regularTotal.toFixed(2)} $)
                </span>
              </div>
            )}
          </div>

          {/* Ventilation Fiscale Revenu Québec */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border ${
              isDark
                ? 'bg-black/30 border-white/10'
                : 'bg-white/80 border-stone-200/80 shadow-sm'
            }`}
          >
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Détaxé (0%)
              </div>
              <div className="font-mono tabular-nums text-base font-medium mt-0.5 text-stone-900 dark:text-white">
                {receipt.subtotalZeroRated.toFixed(2)} $
              </div>
              <span className="text-[10px] text-stone-400">Aliments de base</span>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Taxable
              </div>
              <div className="font-mono tabular-nums text-base font-medium mt-0.5 text-stone-900 dark:text-white">
                {receipt.subtotalTaxable.toFixed(2)} $
              </div>
              <span className="text-[10px] text-stone-400">Articles maison</span>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                TPS (5%)
              </div>
              <div className="font-mono tabular-nums text-base font-medium mt-0.5 text-stone-900 dark:text-white">
                {receipt.tps.toFixed(2)} $
              </div>
              <span className="text-[10px] text-stone-400">Fédérale</span>
            </div>

            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                TVQ (9.975%)
              </div>
              <div className="font-mono tabular-nums text-base font-medium mt-0.5 text-stone-900 dark:text-white">
                {receipt.tvq.toFixed(2)} $
              </div>
              <span className="text-[10px] text-stone-400">Québec</span>
            </div>
          </div>
        </div>

        {/* Boutons d'export mobile */}
        <div className="flex items-center flex-wrap gap-2.5 mt-6 pt-5 border-t border-stone-200/60 dark:border-white/10">
          <button
            onClick={handleCopyClipboard}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all active:scale-95 ${
              copySuccess
                ? 'bg-emerald-600 text-white font-bold'
                : isDark
                ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200'
                : 'bg-stone-100 hover:bg-stone-200 border border-stone-300/80 text-stone-800'
            }`}
          >
            {copySuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{copySuccess ? 'Copié !' : 'Copier (Notes / Keep)'}</span>
          </button>

          <button
            onClick={() => downloadGroceryListFile(items, 'Metro')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all active:scale-95 border ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-stone-200'
                : 'bg-stone-100 hover:bg-stone-200 border-stone-300/80 text-stone-800'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            <span>Fichier .txt</span>
          </button>

          <a
            href={generateMailtoUrl(items)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
              isDark
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
                : 'bg-stone-900 hover:bg-stone-800 text-stone-50'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Par Courriel</span>
          </a>
        </div>
      </div>

      {/* Mode Couple & Split Équitable */}
      <div
        className={`rounded-3xl p-6 transition-all border ${
          isDark ? 'liquid-glass' : 'liquid-glass-light'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                coupleSettings.coupleModeEnabled
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                  : 'bg-stone-500/10 text-stone-400 border-stone-400/20'
              }`}
            >
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-stone-900 dark:text-white">
                  Gestion pour Deux <span className="italic font-light">(Ethan & Copine)</span>
                </h3>
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    coupleSettings.coupleModeEnabled
                      ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border-transparent'
                  }`}
                >
                  {coupleSettings.coupleModeEnabled ? 'Activé' : '1 Personne'}
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans mt-0.5">
                Pondération des coûts selon les régimes (Ethan absorbe le surplus viande/boucherie).
              </p>
            </div>
          </div>

          <button
            onClick={onToggleCoupleMode}
            className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all border active:scale-95 ${
              coupleSettings.coupleModeEnabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-900/30'
                : isDark
                ? 'bg-white/5 hover:bg-white/10 text-stone-300 border-white/10'
                : 'bg-stone-200/80 hover:bg-stone-300 text-stone-800 border-stone-300'
            }`}
          >
            {coupleSettings.coupleModeEnabled ? 'Désactiver' : 'Activer pour Nous Deux'}
          </button>
        </div>

        {coupleSettings.coupleModeEnabled && (
          <div className="mt-5 pt-4 border-t border-stone-200/50 dark:border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-black/20 border-white/5' : 'bg-white/70 border-stone-200'
                }`}
              >
                <div className="text-xs font-mono text-stone-400">Part d'Ethan (Sportif 3 050 kcal)</div>
                <div className="font-mono tabular-nums text-xl font-light mt-1 text-emerald-600 dark:text-emerald-400">
                  {splitReport.user1Share.toFixed(2)} $ CAD{' '}
                  <span className="text-xs font-normal text-stone-400">({splitReport.user1Percent} %)</span>
                </div>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  isDark ? 'bg-black/20 border-white/5' : 'bg-white/70 border-stone-200'
                }`}
              >
                <div className="text-xs font-mono text-stone-400">Part de sa Copine (~1 950 kcal)</div>
                <div className="font-mono tabular-nums text-xl font-light mt-1 text-purple-600 dark:text-purple-300">
                  {splitReport.user2Share.toFixed(2)} $ CAD{' '}
                  <span className="text-xs font-normal text-stone-400">({splitReport.user2Percent} %)</span>
                </div>
              </div>
            </div>

            {/* Jauge */}
            <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${splitReport.user1Percent}%` }} />
              <div className="bg-purple-500 h-full" style={{ width: `${splitReport.user2Percent}%` }} />
            </div>

            <p className="text-[11px] text-stone-400 italic font-sans">{splitReport.explanation}</p>
          </div>
        )}
      </div>

      {/* Barre de Filtres et Ajout Manuel */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
          isDark ? 'bg-white/[0.02] border-white/10' : 'bg-stone-200/50 border-stone-300/60'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'all'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-50 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Tous ({totalItems})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'pending'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-50 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            À acheter ({totalItems - checkedItems})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              filterMode === 'completed'
                ? isDark
                  ? 'bg-white text-stone-950 font-bold'
                  : 'bg-stone-900 text-stone-50 font-bold'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Cochés ({checkedItems})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un article</span>
          </button>

          {checkedItems > 0 && (
            <button
              onClick={onClearChecked}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tout décocher</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulaire d'ajout rapide */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCustomItem}
          className={`p-5 rounded-3xl border space-y-3 animate-in fade-in duration-150 ${
            isDark ? 'liquid-glass' : 'liquid-glass-light'
          }`}
        >
          <div className="font-serif text-sm font-medium text-stone-900 dark:text-white">
            Ajouter un article personnel (produit ménager, café, etc.)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
              }`}
              autoFocus
            />
            <select
              value={newItemAisle}
              onChange={(e) => setNewItemAisle(e.target.value as MetroAisle)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
              }`}
            >
              {Object.entries(AISLE_LABELS).map(([key, meta]) => (
                <option key={key} value={key} className={isDark ? 'bg-stone-900' : 'bg-white'}>
                  {meta.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Format (ex: 1 rouleau, 500g)"
              value={newItemPack}
              onChange={(e) => setNewItemPack(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
              }`}
            />
            <input
              type="number"
              step="0.01"
              placeholder="Prix estimé ($)"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
              }`}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newItemTaxable}
                onChange={(e) => setNewItemTaxable(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>Article taxable (TPS 5% + TVQ 9.975% = 14.975%)</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-900 dark:hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold ${
                  isDark
                    ? 'bg-white text-stone-950 hover:bg-stone-200'
                    : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
                }`}
              >
                Ajouter
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Rayons & Produits */}
      {visibleItems.length === 0 ? (
        <div
          className={`text-center py-12 rounded-3xl border ${
            isDark ? 'liquid-glass' : 'liquid-glass-light'
          }`}
        >
          <ShoppingBag className="w-10 h-10 text-stone-400 mx-auto mb-2 opacity-60" />
          <p className="text-stone-500 text-xs font-mono uppercase tracking-wider">
            Aucun article dans cette vue
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedAisles.map((aisleKey) => {
            const aisleItems = grouped[aisleKey];
            const aisleMeta = AISLE_LABELS[aisleKey as MetroAisle];

            return (
              <div
                key={aisleKey}
                className={`rounded-3xl p-5 sm:p-6 transition-all border ${
                  isDark ? 'liquid-glass' : 'liquid-glass-light'
                }`}
              >
                {/* En-tête de Rayon */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200/50 dark:border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-stone-400 font-bold">
                      0{aisleMeta?.order ?? '#'}
                    </span>
                    <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                      {aisleMeta?.title || aisleKey}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-stone-400">
                    {aisleItems.length} article{aisleItems.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grille des articles avec Liens Canoniques Directs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aisleItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleItem(item.id)}
                      className={`flex items-start justify-between p-3.5 rounded-2xl border transition-all cursor-pointer group ${
                        item.checked
                          ? 'opacity-50 grayscale bg-black/5 dark:bg-black/30 border-transparent'
                          : isDark
                          ? 'bg-white/[0.02] hover:bg-white/[0.06] border-white/5 hover:border-white/15'
                          : 'bg-white/70 hover:bg-white border-stone-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox minimaliste */}
                        <div
                          className={`w-5 h-5 mt-1 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            item.checked
                              ? 'bg-emerald-600 text-white'
                              : isDark
                              ? 'border border-white/20'
                              : 'border border-stone-300'
                          }`}
                        >
                          {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Photo Produit */}
                        {item.imageUrl && (
                          <div
                            className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border relative ${
                              isDark ? 'border-white/10 bg-black/40' : 'border-stone-200 bg-stone-100'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover transition-opacity"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Informations Produit */}
                        <div className="min-w-0 pr-2">
                          <div
                            className={`text-sm font-medium truncate ${
                              item.checked
                                ? 'line-through text-stone-400'
                                : 'text-stone-900 dark:text-white'
                            }`}
                          >
                            {item.name}
                          </div>

                          <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate font-sans">
                            {item.packageDescription}
                          </div>

                          {/* Prix au 100g & Badge Taxe */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap font-mono text-[11px]">
                            {item.unitPriceLabel && (
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                {item.unitPriceLabel}
                              </span>
                            )}
                            <span className="text-[10px] text-stone-400">
                              {item.isTaxable ? 'Taxé (14.975%)' : '0% Taxe'}
                            </span>
                          </div>

                          {/* Badge Membre Moi & Circulaire */}
                          {item.isMoiMemberPrice && (
                            <div className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md mt-1.5 border border-purple-500/20">
                              <Crown className="w-3 h-3 text-amber-500" />
                              <span>{item.moiPriceLabel || 'Prix Membre Moi'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Prix Exact & Lien Canonique Direct Metro.ca */}
                      <div className="text-right shrink-0 ml-2 flex flex-col items-end justify-between self-stretch">
                        <div>
                          <div className="font-mono tabular-nums text-sm font-semibold text-stone-900 dark:text-white">
                            {item.exactPriceMetro.toFixed(2)} $
                          </div>
                          {item.savingsAmount > 0 && (
                            <div className="font-mono text-[10px] text-stone-400 line-through">
                              {item.regularPriceMetro.toFixed(2)} $
                            </div>
                          )}
                        </div>

                        {item.metroProductUrl && (
                          <a
                            href={item.metroProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg border transition-all mt-2 ${
                              isDark
                                ? 'bg-white/5 hover:bg-white/15 text-stone-300 border-white/10'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200'
                            }`}
                            title="Consulter la fiche officielle sur Metro.ca"
                          >
                            <span>Fiche</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}

                        {item.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveItem(item.id);
                            }}
                            className="text-stone-400 hover:text-rose-500 p-1 transition-colors mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
