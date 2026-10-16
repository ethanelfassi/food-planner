'use client';

import React from 'react';
import { GroceryItem } from '@/types';
import { calculateStorePriceComparison } from '@/lib/price-comparator';
import { calculateReceiptTaxes } from '@/lib/grocery';
import { TrendingDown, Flame, Crown, Sparkles, ShieldCheck } from 'lucide-react';

interface DealsAndPricesViewProps {
  groceryItems: GroceryItem[];
  isDark: boolean;
}

export const DealsAndPricesView: React.FC<DealsAndPricesViewProps> = ({ groceryItems, isDark }) => {
  const priceComparison = calculateStorePriceComparison(groceryItems);
  const receipt = calculateReceiptTaxes(groceryItems);
  const metroTotal = priceComparison.find((p) => p.storeName === 'Metro')?.totalEstimated || 0;

  const moiItems = groceryItems.filter((i) => i.isMoiMemberPrice);
  const circularItems = groceryItems.filter((i) => i.flyerHighlight && !i.isMoiMemberPrice);

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Intelligence de Marché • Québec
          </span>
          <span className="text-stone-400 text-xs">•</span>
          <span className="text-xs text-stone-500 dark:text-stone-400 font-sans">
            Circulaires du Jeudi & Programme Moi
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
          Comparateur & <span className="italic">Programme Moi</span>
        </h1>

        <p className="text-sm text-stone-600 dark:text-stone-300 mt-2 max-w-2xl font-sans leading-relaxed">
          Le planificateur favorise les recettes combinant les rabais de circulaire et les tarifs Membre Moi de Metro pour vous garantir le panier le plus avantageux.
        </p>

        {receipt.totalSavingsMoi > 0 && (
          <div
            className={`mt-6 p-4 rounded-2xl border flex items-center justify-between ${
              isDark
                ? 'bg-amber-950/20 border-amber-500/30'
                : 'bg-amber-50 border-amber-300 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold">
                <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-amber-950 dark:text-amber-200 font-bold">
                  Rabais total Membre Moi appliqué
                </div>
                <div className="text-xs text-stone-700 dark:text-stone-300 font-sans">
                  Économie de <strong>{receipt.totalSavingsMoi.toFixed(2)} $ CAD</strong> cette semaine avec votre carte Moi.
                </div>
              </div>
            </div>
            <div className="font-mono tabular-nums text-xl font-medium text-amber-900 dark:text-amber-300">
              -{receipt.totalSavingsMoi.toFixed(2)} $
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
              className={`rounded-3xl p-6 border transition-all flex flex-col justify-between ${
                isMetro
                  ? isDark
                    ? 'liquid-glass border-emerald-500/40 ring-1 ring-emerald-500/20'
                    : 'liquid-glass-light border-emerald-700/40 ring-1 ring-emerald-700/20 shadow-md'
                  : cardGlassClass
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-serif text-sm font-semibold ${
                        isMetro
                          ? 'bg-emerald-600 text-white'
                          : isDark
                          ? 'bg-white/10 text-stone-300'
                          : 'bg-stone-200 text-stone-800'
                      }`}
                    >
                      {store.storeName[0]}
                    </div>
                    <div>
                      <h2 className="font-serif text-base font-medium text-stone-900 dark:text-white">
                        {store.storeName}
                      </h2>
                      <span className="font-mono text-[10px] text-stone-400 block uppercase tracking-wider">
                        {store.bannerType}
                      </span>
                    </div>
                  </div>

                  {isMetro && (
                    <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      Votre choix
                    </span>
                  )}
                </div>

                <div className="my-5">
                  <div className="font-mono tabular-nums text-3xl font-light text-stone-900 dark:text-white">
                    {store.totalEstimated.toFixed(2)}{' '}
                    <span className="text-sm text-stone-400 font-normal">$ CAD</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-1 font-sans">
                    Estimation du panier complet (7 jours)
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200/50 dark:border-white/10 text-xs font-mono">
                {isMetro ? (
                  <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Référence (Prix Moi inclus)
                  </div>
                ) : store.differenceWithMetro < 0 ? (
                  <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Économie : {Math.abs(store.differenceWithMetro).toFixed(2)} $ ({savings}%)
                  </div>
                ) : (
                  <div className="text-stone-400">
                    +{store.differenceWithMetro.toFixed(2)} $ vs Metro
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail des Rabais Membre Moi Détectés */}
      {moiItems.length > 0 && (
        <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                Offres Exclusives Membre Moi Présentes dans votre Panier
              </h2>
            </div>
            <span className="font-mono text-xs font-semibold text-amber-900 dark:text-amber-300">
              {moiItems.length} aubaines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moiItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-white border-stone-300'
                }`}
              >
                <div>
                  <div className="font-medium text-sm text-stone-900 dark:text-white">{item.name}</div>
                  <div className="font-mono text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    {item.packageDescription} • <span className="text-emerald-900 dark:text-emerald-400 font-medium">{item.unitPriceLabel}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2 font-mono">
                  <div className="text-xs font-semibold text-amber-950 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-300 dark:border-amber-500/25">
                    {item.exactPriceMetro.toFixed(2)} $
                  </div>
                  {item.savingsAmount > 0 && (
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 line-through mt-0.5">
                      {item.regularPriceMetro.toFixed(2)} $
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Détail Circulaires */}
      {circularItems.length > 0 && (
        <div className={`rounded-3xl p-6 sm:p-8 transition-all border ${cardGlassClass}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                Articles en Circulaire Régulière (Metro)
              </h2>
            </div>
            <span className="font-mono text-xs text-stone-400">
              {circularItems.length} rabais
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {circularItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isDark
                    ? 'bg-white/[0.02] border-white/5'
                    : 'bg-white/80 border-stone-200'
                }`}
              >
                <div>
                  <div className="font-medium text-sm text-stone-900 dark:text-white">{item.name}</div>
                  <div className="font-mono text-xs text-stone-400 mt-0.5">
                    {item.packageDescription} • <span className="text-emerald-600 dark:text-emerald-400">{item.unitPriceLabel}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="font-mono text-xs text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    {item.flyerHighlight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note Fiscale */}
      <div
        className={`p-6 rounded-3xl border flex items-start gap-4 ${
          isDark ? 'bg-white/[0.02] border-white/5' : 'bg-stone-100/70 border-stone-200'
        }`}
      >
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-sans">
          <h4 className="font-serif text-sm font-medium text-stone-900 dark:text-white">
            Note sur la Dé-taxation Alimentaire au Québec
          </h4>
          <p>
            Toutes les viandes, poissons, produits laitiers, légumes, fruits, œufs, avoine et pain sont à 0 % de taxe au Québec (Loi sur la taxe de vente). Seuls les produits de ménage et articles non alimentaires supportent la TPS (5%) et la TVQ (9.975%).
          </p>
        </div>
      </div>
    </div>
  );
};
