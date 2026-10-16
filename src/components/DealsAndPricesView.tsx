'use client';

import React from 'react';
import { GroceryItem } from '@/types';
import { calculateStorePriceComparison } from '@/lib/price-comparator';
import { calculateReceiptTaxes } from '@/lib/grocery';
import { Store, TrendingDown, Flame, Crown, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface DealsAndPricesViewProps {
  groceryItems: GroceryItem[];
}

export const DealsAndPricesView: React.FC<DealsAndPricesViewProps> = ({ groceryItems }) => {
  const priceComparison = calculateStorePriceComparison(groceryItems);
  const receipt = calculateReceiptTaxes(groceryItems);
  const metroTotal = priceComparison.find((p) => p.storeName === 'Metro')?.totalEstimated || 0;

  // Récupérer les ingrédients en promo ou Membre Moi
  const moiItems = groceryItems.filter((i) => i.isMoiMemberPrice);
  const circularItems = groceryItems.filter((i) => i.flyerHighlight && !i.isMoiMemberPrice);

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs uppercase font-bold tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
            Économies & Intelligence de Marché QC
          </span>
          <span className="text-xs text-slate-400">Programme Moi & Circulaires</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          Comparateur de Panier & Offres Membre Moi
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
          Votre planificateur a automatiquement favorisé les recettes intégrant les <strong>Prix Membre Moi</strong> et les rabais de circulaire de la semaine pour minimiser votre facture à la caisse de Metro.
        </p>

        {receipt.totalSavingsMoi > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-950/60 via-purple-900/40 to-slate-900 border border-purple-500/40 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-200">
                  Rabais total Membre Moi appliqué
                </div>
                <div className="text-xs text-slate-300">
                  Vous économisez <strong>{receipt.totalSavingsMoi.toFixed(2)} $ CAD</strong> cette semaine grâce à votre compte Moi.
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-black text-amber-300">
                -{receipt.totalSavingsMoi.toFixed(2)} $
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cartes Comparatives Multi-Supermarchés */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {priceComparison.map((store) => {
          const isMetro = store.storeName === 'Metro';
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
                    <Sparkles className="w-3.5 h-3.5" /> Supermarché de référence (Prix Moi inclus)
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

      {/* Détail des Rabais Membre Moi Détectés */}
      {moiItems.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-purple-950/40 border border-purple-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                Offres Exclusives Membre Moi Présentes dans votre Menu
              </h2>
            </div>
            <span className="text-xs font-semibold text-amber-300 bg-purple-900/60 px-2.5 py-1 rounded-full border border-purple-500/30">
              {moiItems.length} aubaines Moi
            </span>
          </div>

          <p className="text-xs text-slate-300">
            Ces produits bénéficient d'un tarif préférentiel exclusif sur présentation de la carte ou de l'application Metro Moi :
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moiItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.packageDescription} • <span className="text-emerald-400 font-medium">{item.unitPriceLabel}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <div className="text-xs font-bold text-amber-300 bg-gradient-to-r from-purple-900 to-purple-800 px-2.5 py-1 rounded-lg border border-purple-500/40">
                    {item.exactPriceMetro.toFixed(2)} $ CAD
                  </div>
                  {item.savingsAmount > 0 && (
                    <div className="text-[10px] text-slate-400 line-through mt-0.5">
                      Rég. {item.regularPriceMetro.toFixed(2)} $
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Détail des Rabais Circulaires Standards */}
      {circularItems.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">
                Articles en Circulaire Régulière (Metro)
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              {circularItems.length} rabais
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {circularItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-sm text-white">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {item.packageDescription} • <span className="text-emerald-400 font-medium">{item.unitPriceLabel}</span>
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
      )}

      {/* Informations Légales Fiscales Revenu Québec */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-white">Règles Fiscales de Revenu Québec (Aliments de base détaxés à 0%)</h3>
          <p className="leading-relaxed">
            Au Québec, la nourriture de base (viandes fraîches, volaille, poisson, œufs, produits laitiers, fruits, légumes, pain, avoine, pâtes, riz) est strictement <strong>détaxée (0 % de TPS et 0 % de TVQ)</strong>. Seuls les produits non alimentaires ou certains snacks préparés individuellement sont assujettis aux taxes combinées de <strong>14,975 %</strong>. Votre ticket FoodPlanner applique fidèlement ces règles.
          </p>
        </div>
      </div>
    </div>
  );
};
