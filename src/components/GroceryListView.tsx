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
  Flame, 
  Trash2, 
  CheckCheck,
  ShoppingBag,
  ExternalLink,
  Users,
  Receipt,
  Sparkles,
  ShieldCheck,
  Crown
} from 'lucide-react';

interface GroceryListViewProps {
  items: GroceryItem[];
  coupleSettings: CoupleSettings;
  splitReport: SplitCostReport;
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

  // Calcul du ticket fiscal exact
  const receipt = calculateReceiptTaxes(items);

  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;

  // Filtrage
  const visibleItems = items.filter((i) => {
    if (filterMode === 'pending') return !i.checked;
    if (filterMode === 'completed') return i.checked;
    return true;
  });

  // Grouper par rayon
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
      alert('Impossible de copier automatiquement. Veuillez télécharger le fichier texte.');
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
    <div className="space-y-6">
      {/* TICKET DE CAISSE FISCAL EXACT (REVENU QUÉBEC) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Glow décoratif */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Receipt className="w-3.5 h-3.5" /> Ticket Exact Metro Québec
              </span>
              <span className="text-xs text-slate-400">
                {checkedItems} / {totalItems} articles cochés
              </span>
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {receipt.totalWithTax.toFixed(2)} <span className="text-xl font-bold text-emerald-400">$ CAD</span>
              </h1>
              <span className="text-xs text-slate-300 font-medium">
                (Montant exact à payer à la caisse)
              </span>
            </div>

            {receipt.totalSavingsMoi > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  Économies Membre Moi & Promos : -{receipt.totalSavingsMoi.toFixed(2)} $ CAD
                </span>
                <span className="text-xs text-slate-400 line-through">
                  Total régulier : {receipt.regularTotal.toFixed(2)} $
                </span>
              </div>
            )}
          </div>

          {/* Grille de ventilation fiscale */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-xs">
            <div>
              <div className="text-slate-400 text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Détaxé (0%)
              </div>
              <div className="font-bold text-white text-sm mt-0.5">
                {receipt.subtotalZeroRated.toFixed(2)} $
              </div>
              <span className="text-[10px] text-slate-400">Aliments de base</span>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Articles taxés</div>
              <div className="font-bold text-white text-sm mt-0.5">
                {receipt.subtotalTaxable.toFixed(2)} $
              </div>
              <span className="text-[10px] text-slate-400">Produits non-nourr.</span>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">TPS (5.0%)</div>
              <div className="font-bold text-slate-200 text-sm mt-0.5">
                {receipt.tps.toFixed(2)} $
              </div>
              <span className="text-[10px] text-slate-400">Fédérale</span>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">TVQ (9.975%)</div>
              <div className="font-bold text-slate-200 text-sm mt-0.5">
                {receipt.tvq.toFixed(2)} $
              </div>
              <span className="text-[10px] text-slate-400">Québec</span>
            </div>
          </div>
        </div>

        {/* Boutons d'export mobile */}
        <div className="flex items-center flex-wrap gap-2 mt-5 pt-4 border-t border-slate-800 relative z-10">
          <button
            onClick={handleCopyClipboard}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              copySuccess
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 active:scale-95'
            }`}
            title="Copier avec le montant exact et les prix aux 100g"
          >
            {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-emerald-400" />}
            <span>{copySuccess ? 'Copié !' : 'Copier (Notes / Keep)'}</span>
          </button>

          <button
            onClick={() => downloadGroceryListFile(items, 'Metro')}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all border border-slate-700 active:scale-95"
            title="Télécharger le fichier .txt complet avec détail fiscal"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Fichier .txt</span>
          </button>

          <a
            href={generateMailtoUrl(items)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md shadow-emerald-900/30 active:scale-95"
            title="S'envoyer le ticket exact par courriel"
          >
            <Mail className="w-4 h-4" />
            <span>Par Courriel</span>
          </a>
        </div>
      </div>

      {/* Sélecteur Mode Couple & Répartition Équitable */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
              coupleSettings.coupleModeEnabled 
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' 
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">
                  Mode Deux Personnes (Ethan & Copine)
                </h3>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                  coupleSettings.coupleModeEnabled
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {coupleSettings.coupleModeEnabled ? 'Activé' : 'Désactivé (1 pers)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calcule la part exacte au centime près en tenant compte de la surconsommation sportive d'Ethan.
              </p>
            </div>
          </div>

          <button
            onClick={onToggleCoupleMode}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 border ${
              coupleSettings.coupleModeEnabled
                ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-md shadow-purple-900/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            {coupleSettings.coupleModeEnabled ? 'Désactiver le Mode Couple' : 'Activer pour Nous Deux'}
          </button>
        </div>

        {coupleSettings.coupleModeEnabled && (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Part Ethan */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="font-semibold text-slate-200">Part d'Ethan (Sportif)</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    3 050 kcal • 165g prot (Surcoût viandes/boucherie)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-emerald-400">
                    {splitReport.user1Share.toFixed(2)} $ CAD
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    {splitReport.user1Percent} % de la facture
                  </div>
                </div>
              </div>

              {/* Part Copine */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="font-semibold text-slate-200">Part de sa Copine</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ~1 950 kcal • 75g prot (Portions standards)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-purple-300">
                    {splitReport.user2Share.toFixed(2)} $ CAD
                  </div>
                  <div className="text-[11px] font-semibold text-slate-400">
                    {splitReport.user2Percent} % de la facture
                  </div>
                </div>
              </div>
            </div>

            {/* Jauge */}
            <div>
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${splitReport.user1Percent}%` }} 
                />
                <div 
                  className="bg-purple-500 h-full transition-all duration-300" 
                  style={{ width: `${splitReport.user2Percent}%` }} 
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>Ethan : {splitReport.user1Percent}% ({splitReport.user1Share.toFixed(2)}$)</span>
                <span>Copine : {splitReport.user2Percent}% ({splitReport.user2Share.toFixed(2)}$)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              ℹ️ {splitReport.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Barre de filtres & Ajout rapide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({totalItems})
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'pending'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            À acheter ({totalItems - checkedItems})
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'completed'
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cochés ({checkedItems})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un article hors-recette</span>
          </button>

          {checkedItems > 0 && (
            <button
              onClick={onClearChecked}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Décocher tous les articles"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Décocher tout</span>
            </button>
          )}
        </div>
      </div>

      {/* Formulaire d'ajout rapide avec statut de taxe */}
      {showAddForm && (
        <form
          onSubmit={handleCreateCustomItem}
          className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 animate-in fade-in duration-150"
        >
          <div className="font-semibold text-xs uppercase tracking-wider text-slate-300">
            Ajouter un article personnel (produit ménager, café, etc.)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Nom de l'article"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
              autoFocus
            />
            <select
              value={newItemAisle}
              onChange={(e) => setNewItemAisle(e.target.value as MetroAisle)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {Object.entries(AISLE_LABELS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Format (ex: 1 rouleau, 500g)"
              value={newItemPack}
              onChange={(e) => setNewItemPack(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Prix estimé ($)"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newItemTaxable}
                onChange={(e) => setNewItemTaxable(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-950 border-slate-700 focus:ring-emerald-400"
              />
              <span>Article soumis aux taxes (TPS 5% + TVQ 9.975% = 14.975%)</span>
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs"
              >
                Ajouter à la liste
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Liste des Rayons du Supermarché Metro avec Prix Exacts, Prix aux 100g et Badges Moi */}
      {visibleItems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aucun article ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedAisles.map((aisleKey) => {
            const aisleItems = grouped[aisleKey];
            const aisleMeta = AISLE_LABELS[aisleKey as MetroAisle];

            return (
              <div
                key={aisleKey}
                className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm"
              >
                {/* En-tête de Rayon */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                      {aisleMeta?.order ?? '#'}
                    </span>
                    <h2 className="text-base font-bold text-white tracking-wide">
                      {aisleMeta?.title || aisleKey}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {aisleItems.length} article{aisleItems.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Grille des articles du rayon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aisleItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleItem(item.id)}
                      className={`flex items-start justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        item.checked
                          ? 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-60'
                          : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/50 hover:border-emerald-500/50 text-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-5 h-5 mt-1 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                            item.checked
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border-2 border-slate-600'
                          }`}
                        >
                          {item.checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {/* Photo Produit */}
                        {item.imageUrl ? (
                          <div className="w-14 h-14 rounded-lg bg-slate-950 overflow-hidden shrink-0 border border-slate-700/60 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className={`w-full h-full object-cover transition-opacity ${item.checked ? 'opacity-40 grayscale' : 'opacity-90'}`}
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 text-slate-500 text-xs">
                            Metro
                          </div>
                        )}

                        {/* Infos Produit */}
                        <div className="min-w-0 pr-2">
                          <div className={`text-sm font-semibold truncate ${item.checked ? 'line-through text-slate-500' : 'text-white'}`}>
                            {item.name}
                          </div>
                          
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.packageDescription}
                          </div>

                          {/* Prix au 100g & Statut Taxe */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.unitPriceLabel && (
                              <span className="text-[11px] font-semibold text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                {item.unitPriceLabel}
                              </span>
                            )}
                            
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              item.isTaxable
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.isTaxable ? 'Taxé (14.975%)' : 'Détaxé (0%)'}
                            </span>
                          </div>

                          {/* Badges Membre Moi & Circulaire */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {item.isMoiMemberPrice && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-200 bg-gradient-to-r from-purple-900/60 to-purple-800/80 px-2 py-0.5 rounded-full border border-purple-500/40 shadow-sm">
                                <Crown className="w-3 h-3 text-amber-300" />
                                {item.moiPriceLabel || 'Prix Membre Moi'}
                              </span>
                            )}

                            {item.flyerHighlight && !item.isMoiMemberPrice && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                <Flame className="w-3 h-3 text-amber-400" />
                                {item.flyerHighlight}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Prix Exact et Lien Officiel Metro */}
                      <div className="text-right shrink-0 ml-2 flex flex-col items-end justify-center gap-1">
                        <div>
                          <div className="text-sm font-extrabold text-emerald-400">
                            {item.exactPriceMetro.toFixed(2)} $ CAD
                          </div>
                          {item.savingsAmount > 0 && (
                            <div className="text-[10px] text-slate-400 line-through">
                              Rég. {item.regularPriceMetro.toFixed(2)} $
                            </div>
                          )}
                        </div>

                        {item.metroProductUrl && (
                          <a
                            href={item.metroProductUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-500/20 transition-colors mt-1"
                            title="Vérifier le prix exact et les stocks en direct sur Metro.ca"
                          >
                            <span>Metro.ca</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {item.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveItem(item.id);
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
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
