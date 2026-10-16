'use client';

import React, { useState, useEffect } from 'react';
import { CoupleSettings, GroceryItem, MetroAisle, Recipe, SplitCostReport, WeeklyPlan } from '@/types';
import { generateWeeklyPlan, replaceRecipeInPlan } from '@/lib/planner';
import { generateGroceryList } from '@/lib/grocery';
import { DEFAULT_COUPLE_SETTINGS, calculateSplitCost } from '@/lib/couple-split';
import { Header } from '@/components/Header';
import { WeeklyPlannerView } from '@/components/WeeklyPlannerView';
import { GroceryListView } from '@/components/GroceryListView';
import { DealsAndPricesView } from '@/components/DealsAndPricesView';
import { CalorieTrackerView } from '@/components/CalorieTrackerView';
import { RecipeModal } from '@/components/RecipeModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'planner' | 'grocery' | 'prices' | 'tracker'>('planner');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [coupleSettings, setCoupleSettings] = useState<CoupleSettings>(DEFAULT_COUPLE_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [splitReport, setSplitReport] = useState<SplitCostReport>({
    totalMetroCost: 0,
    user1Share: 0,
    user2Share: 0,
    user1Percent: 100,
    user2Percent: 0,
    meatDairyShareUser1: 0,
    meatDairyShareUser2: 0,
    explanation: '',
  });

  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Synchroniser la classe 'dark' sur l'élément racine <html>
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Initialisation au montage
  useEffect(() => {
    const plan = generateWeeklyPlan();
    setWeeklyPlan(plan);
    const groceries = generateGroceryList(plan, coupleSettings.coupleModeEnabled);
    setGroceryItems(groceries);
    setSplitReport(calculateSplitCost(groceries, coupleSettings));
  }, []);

  const handleToggleCoupleMode = () => {
    const updatedSettings: CoupleSettings = {
      ...coupleSettings,
      coupleModeEnabled: !coupleSettings.coupleModeEnabled,
    };
    setCoupleSettings(updatedSettings);

    if (weeklyPlan) {
      const newGroceries = generateGroceryList(weeklyPlan, updatedSettings.coupleModeEnabled);
      // Maintenir les éléments cochés
      const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));
      const merged = newGroceries.map((item) => ({
        ...item,
        checked: checkedMap.get(item.id) || false,
      }));
      setGroceryItems(merged);
      setSplitReport(calculateSplitCost(merged, updatedSettings));
    }
  };

  const handleRegenerateAll = () => {
    const newPlan = generateWeeklyPlan();
    setWeeklyPlan(newPlan);
    const newGroceries = generateGroceryList(newPlan, coupleSettings.coupleModeEnabled);
    setGroceryItems(newGroceries);
    setSplitReport(calculateSplitCost(newGroceries, coupleSettings));
  };

  const handleReplaceRecipe = (
    dayIndex: number,
    mealType: 'breakfast' | 'dinner' | 'snack',
    newRecipeId: string
  ) => {
    if (!weeklyPlan) return;
    const updatedPlan = replaceRecipeInPlan(weeklyPlan, dayIndex, mealType, newRecipeId);
    setWeeklyPlan(updatedPlan);

    // Mettre à jour la liste d'épicerie en préservant l'état des cases déjà cochées
    const newGroceries = generateGroceryList(updatedPlan, coupleSettings.coupleModeEnabled);
    const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));

    const merged = newGroceries.map((item) => ({
      ...item,
      checked: checkedMap.get(item.id) || false,
    }));

    // Conserver aussi les articles manuels ajoutés
    const customItems = groceryItems.filter((i) => i.isCustom);
    const finalItems = [...merged, ...customItems];
    setGroceryItems(finalItems);
    setSplitReport(calculateSplitCost(finalItems, coupleSettings));
  };

  const handleToggleItem = (id: string) => {
    setGroceryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleAddItem = (
    name: string,
    aisle: MetroAisle,
    packageDescription: string,
    isTaxable = false,
    price = 0
  ) => {
    const newItem: GroceryItem = {
      id: `custom_${Date.now()}`,
      name,
      aisle,
      neededQuantity: 1,
      unit: 'unite',
      packageDescription,
      packageCount: 1,
      regularPriceMetro: price,
      exactPriceMetro: price,
      unitPriceLabel: price > 0 ? `${price.toFixed(2)} $ / unité` : '',
      pricePer100g: 0,
      isTaxable,
      isMoiMemberPrice: false,
      savingsAmount: 0,
      estimatedPriceMaxi: price,
      estimatedPriceSuperC: price,
      estimatedPriceIGA: price,
      checked: false,
      isCustom: true,
    };
    const updated = [newItem, ...groceryItems];
    setGroceryItems(updated);
    setSplitReport(calculateSplitCost(updated, coupleSettings));
  };

  const handleRemoveItem = (id: string) => {
    const updated = groceryItems.filter((item) => item.id !== id);
    setGroceryItems(updated);
    setSplitReport(calculateSplitCost(updated, coupleSettings));
  };

  const handleClearChecked = () => {
    setGroceryItems((prev) => prev.map((item) => ({ ...item, checked: false })));
  };

  if (!weeklyPlan) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#0B0C0E] text-stone-300' : 'bg-[#FAF8F5] text-stone-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-serif italic text-base">Composition de votre menu nordique & sportif...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#0B0C0E] text-stone-100' : 'bg-[#FAF8F5] text-stone-900'
      }`}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groceryCount={groceryItems.length}
        coupleModeEnabled={coupleSettings.coupleModeEnabled}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'planner' && (
          <WeeklyPlannerView
            plan={weeklyPlan}
            isDark={isDark}
            onRegenerateAll={handleRegenerateAll}
            onReplaceRecipe={handleReplaceRecipe}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
          />
        )}

        {activeTab === 'grocery' && (
          <GroceryListView
            items={groceryItems}
            coupleSettings={coupleSettings}
            splitReport={splitReport}
            isDark={isDark}
            onToggleItem={handleToggleItem}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onClearChecked={handleClearChecked}
            onToggleCoupleMode={handleToggleCoupleMode}
          />
        )}

        {activeTab === 'tracker' && (
          <CalorieTrackerView currentDayPlan={weeklyPlan.days[0]} isDark={isDark} />
        )}

        {activeTab === 'prices' && (
          <DealsAndPricesView groceryItems={groceryItems} isDark={isDark} />
        )}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        isDark={isDark}
        onClose={() => setSelectedRecipe(null)}
      />

      <footer
        className={`border-t py-8 text-center text-xs transition-colors ${
          isDark
            ? 'border-white/[0.08] bg-[#0B0C0E] text-stone-400'
            : 'border-stone-200 bg-[#FAF8F5] text-stone-500'
        }`}
      >
        <p className="font-serif italic text-sm">
          FoodPlanner QC • Conçu pour Metro au Québec • Nutrition sportive 3,050 kcal & 165g P • Répartition équitable couple
        </p>
      </footer>
    </div>
  );
}
