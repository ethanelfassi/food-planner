'use client';

import React from 'react';
import { GroceryItem } from '@/types';
import { calculateStorePriceComparison } from '@/lib/price-comparator';
import { Store, TrendingDown, Flame, DollarSign, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface DealsAndPricesViewProps {
  groceryItems: GroceryItem[];
}

export const DealsAndPricesView: React.FC<DealsAndPricesViewProps> = ({ groceryItems }) => {
  const priceComparison = calculateStorePriceComparison(groceryItems);
  const metroTotal = priceComparison.find((p) => p.storeName === 'Metro')?.totalEstimated || 0;

  // Récupérer les ingrédients en promo dans la liste
  const itemsWithPromos = groceryItems.filter((i) => i.flyerHighlight);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Économies & Intelligence de Marché QC
          </span>
          <span className="text-xs text-slate-400">Circulaires du Jeudi</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          Comparateur de Panier & Circulaires Hebdomadaires
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
          Au Québec, les circulaires changent chaque jeudi. Voici la simulation du coût de votre panier hebdomadaire d'athlète (aliments complets, ~3 050 kcal) selon les bannières alimentaires.
        </p>
      </div>

      {/* Cartes Comparatives Multi-Supermarchés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {priceComparison.map((store) => {
          const isMetro = store.storeName === 'Metro';
          const isDiscount = store.bannerType === 'Discount';
          const savings = metroTotal > 0 ? Math.round(((metroTotal - store.totalEstimated) / metroTotal) * 100) : 0;

          return (
            <div
              key={store.storeName}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                isMetro
                  ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      isMetro ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {store.storeName[0]}
                    </div>
                    <div>
                      <h2 className="font-bold text-white text-base">{store.storeName}</h2>
                      <span className="text-[11px] text-slate-400 block">{store.bannerType}</span>
                    </div>
                  </div>

                  {isMetro && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Votre choix
                    </span>
                  )}
                </div>

                <div className="my-4">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">
                    {store.totalEstimated.toFixed(2)} <span className="text-sm font-semibold text-slate-400">$ CAD</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Estimation du panier complet (7 jours)
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                {isMetro ? (
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Supermarché de référence sélectionné
                  </div>
                ) : store.differenceWithMetro < 0 ? (
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Économie potentielle : {Math.abs(store.differenceWithMetro).toFixed(2)} $ ({savings}%)
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    +{store.differenceWithMetro.toFixed(2)} $ par rapport à Metro
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail des Rabais Circulaires Détectés dans la Semaine */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              Articles en Vedette Circulaire dans votre Menu
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {itemsWithPromos.length} articles en promotion
          </span>
        </div>

        <p className="text-xs text-slate-300">
          Votre planificateur a automatiquement priorisé des recettes composées d'ingrédients en rabais cette semaine :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {itemsWithPromos.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.packageDescription}</div>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 inline-block">
                  {item.flyerHighlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conseils Stratégiques pour Athlète au Québec */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800/60 border border-slate-700/50 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-xs sm:text-sm">
          <h3 className="font-bold text-white">Astuce Épicerie Sportive & Prise de Masse au Québec</h3>
          <p className="text-slate-300 leading-relaxed">
            Pour maintenir votre cible de <strong>~165 g de protéines par jour sans poudre</strong> au meilleur tarif, la circulaire Metro du jeudi est particulièrement avantageuse pour les gros paquets de poitrines de poulet club et le saumon frais. Si vous souhaitez maximiser les économies sur les féculents (avoine, riz, pâtes) et les œufs, une halte ponctuelle chez <strong>Maxi</strong> ou <strong>Super C</strong> vous fait économiser environ <strong>25 à 30 $ par semaine</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
