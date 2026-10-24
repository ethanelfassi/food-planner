'use client';

import React, { useState } from 'react';
import { GroceryItem, Ingredient, UserCustomizationSettings } from '@/types';
import { calculateStorePriceComparison } from '@/lib/price-comparator';
import { calculateReceiptTaxes } from '@/lib/grocery';
import { TrendingDown, Flame, Crown, Sparkles, ShieldCheck, Store, Dumbbell } from 'lucide-react';
import { ProteinEfficiencyCalculator } from '@/components/ProteinEfficiencyCalculator';

interface DealsAndPricesViewProps {
  groceryItems: GroceryItem[];
  isDark: boolean;
  customProducts?: Ingredient[];
  customPrices?: Record<string, number>;
  userSettings?: UserCustomizationSettings;
  initialSubTab?: 'deals' | 'protein';
}

const DealsAndPricesViewComponent: React.FC<DealsAndPricesViewProps> = ({
  groceryItems,
  isDark,
  customProducts = [],
  customPrices = {},
  userSettings,
  initialSubTab = 'deals',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'deals' | 'protein'>(initialSubTab);

  const priceComparison = calculateStorePriceComparison(groceryItems);
  const receipt = calculateReceiptTaxes(groceryItems);
  const metroTotal = priceComparison.find((p) => p.storeName === 'Metro')?.totalEstimated || 0;

  const moiItems = groceryItems.filter((i) => i.isMoiMemberPrice);
  const circularItems = groceryItems.filter((i) => i.flyerHighlight && !i.isMoiMemberPrice);

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-6">
      {/* Barre de Bascule des Sous-Onglets (Rabais vs Rentabilité Protéique) */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-stone-200/60 dark:bg-white/[0.04] border border-stone-300/60 dark:border-white/10 w-full sm:w-auto overflow-x-auto scrollbar-none flex-nowrap">
          <button
            onClick={() => setActiveSubTab('deals')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeSubTab === 'deals'
                ? isDark
                  ? 'bg-white text-stone-950 font-semibold shadow-md'
                  : 'bg-stone-900 text-white font-semibold shadow-sm'
                : isDark
                ? 'text-stone-400 hover:text-white'
                : 'text-stone-600 hover:text-stone-900 font-medium'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span className="truncate">Circulaires & Magasins</span>
          </button>

          <button
            onClick={() => setActiveSubTab('protein')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
              activeSubTab === 'protein'
                ? isDark
                  ? 'bg-white text-stone-950 font-semibold shadow-md'
                  : 'bg-stone-900 text-white font-semibold shadow-sm'
                : isDark
                ? 'text-stone-400 hover:text-white'
                : 'text-stone-600 hover:text-stone-900 font-medium'
            }`}
          >
            <Dumbbell className="w-4 h-4 shrink-0" />
            <span className="truncate">Rentabilité Protéique</span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-md text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
              Nouveau
            </span>
          </button>
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 font-mono hidden md:block">
          {activeSubTab === 'deals' ? 'Marché Métro ETS QC H3C 1K6' : 'Ratio Prix / Protéines Pures'}
        </div>
      </div>

      {/* Vue 1 : Calculateur de Rentabilité Protéique */}
      {activeSubTab === 'protein' && (
        <ProteinEfficiencyCalculator
          customProducts={customProducts}
          customPrices={customPrices}
          userSettings={userSettings}
          isDark={isDark}
        />
      )}

      {/* Vue 2 : Comparateur de Magasins & Circulaires Metro */}
      {activeSubTab === 'deals' && (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
          {/* En-tête */}
          <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold">
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
                    ? 'bg-white/[0.03] border-white/10'
                    : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white flex items-center justify-center font-bold border border-stone-200 dark:border-white/10">
                    <Crown className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-stone-900 dark:text-stone-100 font-bold">
                      Rabais total Membre Moi appliqué
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 font-sans">
                      Économie de <strong>{receipt.totalSavingsMoi.toFixed(2)} $ CAD</strong> cette semaine avec votre carte Moi.
                    </div>
                  </div>
                </div>
                <div className="font-mono tabular-nums text-xl font-medium text-stone-950 dark:text-white">
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
                        ? 'liquid-glass border-white/40 ring-1 ring-white/20'
                        : 'liquid-glass-light border-stone-900 ring-1 ring-stone-900 shadow-md'
                      : cardGlassClass
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-serif text-sm font-semibold ${
                            isMetro
                              ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950'
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
                        <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-900 text-white dark:bg-white dark:text-stone-950 border border-stone-800 dark:border-white font-semibold">
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
                      <div className="text-stone-800 dark:text-stone-200 flex items-center gap-1.5 font-medium">
                        <Sparkles className="w-3.5 h-3.5" /> Référence (Prix Moi inclus)
                      </div>
                    ) : store.differenceWithMetro < 0 ? (
                      <div className="text-stone-950 dark:text-white font-medium flex items-center gap-1">
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
                  <Crown className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                  <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                    Offres Exclusives Membre Moi Présentes dans votre Panier
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold text-stone-700 dark:text-stone-300">
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
                        : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm text-stone-900 dark:text-white">{item.name}</div>
                      <div className="font-mono text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        {item.packageDescription} • <span className="text-stone-900 dark:text-stone-200 font-medium">{item.unitPriceLabel}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2 font-mono">
                      <div className="text-xs font-semibold text-stone-900 dark:text-white bg-stone-100 dark:bg-white/10 px-2.5 py-0.5 rounded-lg border border-stone-300 dark:border-white/20">
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
                  <Flame className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                  <h2 className="font-serif text-xl font-normal text-stone-900 dark:text-white">
                    Articles en Circulaire Régulière (Metro)
                  </h2>
                </div>
                <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
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
                        : 'bg-white border-stone-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-sm text-stone-900 dark:text-white">{item.name}</div>
                      <div className="font-mono text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {item.packageDescription} • <span className="text-stone-900 dark:text-stone-200 font-medium">{item.unitPriceLabel}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="font-mono text-xs text-stone-900 dark:text-white bg-stone-100 dark:bg-white/10 px-2 py-0.5 rounded-lg border border-stone-300 dark:border-white/20 font-medium">
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
            <ShieldCheck className="w-5 h-5 text-stone-700 dark:text-stone-300 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400 leading-relaxed font-sans">
              <h4 className="font-serif text-sm font-medium text-stone-900 dark:text-white">
                Note sur la Dé-taxation Alimentaire au Québec
              </h4>
              <p>
                Toutes les viandes, poissons, produits laitiers, légumes, fruits, œufs, avoine et pain sont à 0 % de taxe au Québec (Loi sur la taxe de vente). Seuls les produits de ménage et articles non alimentaires supportent la TPS (5%) et la TVQ (9.975%).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DealsAndPricesView = React.memo(DealsAndPricesViewComponent);
