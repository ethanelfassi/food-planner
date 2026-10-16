'use client';

import React, { useState, useEffect } from 'react';
import { 
  CoupleSettings, 
  GroceryItem, 
  MetroAisle, 
  ProductPreferenceStatus, 
  ProductPreferencesMap, 
  Recipe, 
  SplitCostReport, 
  WeeklyPlan,
  CustomPricesMap,
  UserCustomizationSettings,
  DEFAULT_USER_SETTINGS
} from '@/types';
import { generateWeeklyPlan, replaceRecipeInPlan } from '@/lib/planner';
import { generateGroceryList } from '@/lib/grocery';
import { DEFAULT_COUPLE_SETTINGS, calculateSplitCost } from '@/lib/couple-split';
import { Header } from '@/components/Header';
import { WeeklyPlannerView } from '@/components/WeeklyPlannerView';
import { GroceryListView } from '@/components/GroceryListView';
import { DealsAndPricesView } from '@/components/DealsAndPricesView';
import { CalorieTrackerView } from '@/components/CalorieTrackerView';
import { ProductPreferencesView } from '@/components/ProductPreferencesView';
import { RecipeModal } from '@/components/RecipeModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'planner' | 'grocery' | 'prices' | 'tracker' | 'preferences'>('planner');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [coupleSettings, setCoupleSettings] = useState<CoupleSettings>(DEFAULT_COUPLE_SETTINGS);
  const [preferences, setPreferences] = useState<ProductPreferencesMap>({});
  const [customPrices, setCustomPrices] = useState<CustomPricesMap>({});
  const [userSettings, setUserSettings] = useState<UserCustomizationSettings>(DEFAULT_USER_SETTINGS);
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

  // Initialisation complète au montage avec chargement de la base SQLite
  useEffect(() => {
    // 1. Thème
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('fp_theme') as 'dark' | 'light' | null) : null;
    const initialTheme = saved || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 2. Charger les préférences, prix personnalisés et réglages depuis SQLite
    const initAppData = async () => {
      let loadedPrefs: ProductPreferencesMap = {};
      let loadedPrices: CustomPricesMap = {};
      let loadedSettings: UserCustomizationSettings = DEFAULT_USER_SETTINGS;

      try {
        const res = await fetch('/api/preferences');
        if (res.ok) {
          const data = await res.json();
          loadedPrefs = data.preferences || {};
          loadedPrices = data.customPrices || {};
          if (data.settings) {
            loadedSettings = data.settings;
          }
          setPreferences(loadedPrefs);
          setCustomPrices(loadedPrices);
          setUserSettings(loadedSettings);
        }
      } catch (err) {
        console.warn('Impossible de joindre /api/preferences, fallback local:', err);
      }

      // Synchroniser les paramètres de couple avec les variables personnalisées
      const initialCoupleSettings: CoupleSettings = {
        ...DEFAULT_COUPLE_SETTINGS,
        user1: {
          ...DEFAULT_COUPLE_SETTINGS.user1,
          targetCalories: loadedSettings.targetCalories,
          targetProtein: loadedSettings.targetProtein,
        },
        user2: {
          ...DEFAULT_COUPLE_SETTINGS.user2,
          targetCalories: loadedSettings.partnerCalories,
          targetProtein: loadedSettings.partnerProtein,
        },
      };
      setCoupleSettings(initialCoupleSettings);

      // 3. Générer le menu hebdomadaire et la liste d'épicerie avec prix custom
      const plan = generateWeeklyPlan(loadedPrefs);
      setWeeklyPlan(plan);
      const groceries = generateGroceryList(
        plan,
        initialCoupleSettings.coupleModeEnabled,
        loadedPrices,
        loadedSettings.targetCalories,
        loadedSettings.partnerCalories
      );
      setGroceryItems(groceries);
      setSplitReport(calculateSplitCost(groceries, initialCoupleSettings));
    };

    initAppData();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('fp_theme', next);
      }
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Mise à jour d'un prix personnalisé avec persistance SQLite immédiate
  const handleUpdateCustomPrice = async (ingredientId: string, price: number | null) => {
    const nextPrices: CustomPricesMap = { ...customPrices };
    if (price === null) {
      delete nextPrices[ingredientId];
    } else {
      nextPrices[ingredientId] = price;
    }
    setCustomPrices(nextPrices);

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_custom_price',
          ingredientId,
          price,
        }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde custom price SQLite:', err);
    }

    if (weeklyPlan) {
      const newGroceries = generateGroceryList(
        weeklyPlan,
        coupleSettings.coupleModeEnabled,
        nextPrices,
        userSettings.targetCalories,
        userSettings.partnerCalories
      );
      const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));
      const merged = newGroceries.map((item) => ({
        ...item,
        checked: checkedMap.get(item.id) || false,
      }));
      const customItems = groceryItems.filter((i) => i.isCustom);
      const finalItems = [...merged, ...customItems];
      setGroceryItems(finalItems);
      setSplitReport(calculateSplitCost(finalItems, coupleSettings));
    }
  };

  // Mise à jour des variables métaboliques & budget avec persistance SQLite
  const handleUpdateSettings = async (newSettings: Partial<UserCustomizationSettings>) => {
    const mergedSettings: UserCustomizationSettings = {
      ...userSettings,
      ...newSettings,
    };
    setUserSettings(mergedSettings);

    const updatedCoupleSettings: CoupleSettings = {
      ...coupleSettings,
      user1: {
        ...coupleSettings.user1,
        targetCalories: mergedSettings.targetCalories,
        targetProtein: mergedSettings.targetProtein,
      },
      user2: {
        ...coupleSettings.user2,
        targetCalories: mergedSettings.partnerCalories,
        targetProtein: mergedSettings.partnerProtein,
      },
    };
    setCoupleSettings(updatedCoupleSettings);

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          settings: mergedSettings,
        }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde settings SQLite:', err);
    }

    if (weeklyPlan) {
      const newGroceries = generateGroceryList(
        weeklyPlan,
        updatedCoupleSettings.coupleModeEnabled,
        customPrices,
        mergedSettings.targetCalories,
        mergedSettings.partnerCalories
      );
      const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));
      const merged = newGroceries.map((item) => ({
        ...item,
        checked: checkedMap.get(item.id) || false,
      }));
      const customItems = groceryItems.filter((i) => i.isCustom);
      const finalItems = [...merged, ...customItems];
      setGroceryItems(finalItems);
      setSplitReport(calculateSplitCost(finalItems, updatedCoupleSettings));
    }
  };

  // Mise à jour d'une préférence produit (liked / disliked / neutral)
  const handleUpdatePreference = async (ingredientId: string, status: ProductPreferenceStatus) => {
    const nextPrefs: ProductPreferencesMap = { ...preferences };
    if (status === 'neutral') {
      delete nextPrefs[ingredientId];
    } else {
      nextPrefs[ingredientId] = status;
    }
    setPreferences(nextPrefs);

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId, status }),
      });
    } catch (err) {
      console.error('Erreur lors de la sauvegarde SQLite:', err);
    }

    if (status === 'disliked') {
      const newPlan = generateWeeklyPlan(nextPrefs);
      setWeeklyPlan(newPlan);
      const newGroceries = generateGroceryList(
        newPlan,
        coupleSettings.coupleModeEnabled,
        customPrices,
        userSettings.targetCalories,
        userSettings.partnerCalories
      );
      const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));
      const merged = newGroceries.map((item) => ({
        ...item,
        checked: checkedMap.get(item.id) || false,
      }));
      setGroceryItems(merged);
      setSplitReport(calculateSplitCost(merged, coupleSettings));
    }
  };

  // Réinitialiser toutes les préférences
  const handleResetAllPreferences = async () => {
    const keys = Object.keys(preferences);
    setPreferences({});

    try {
      await Promise.all(
        keys.map((id) =>
          fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ingredientId: id, status: 'neutral' }),
          })
        )
      );
    } catch (err) {
      console.error('Erreur reset preferences SQLite:', err);
    }

    const newPlan = generateWeeklyPlan({});
    setWeeklyPlan(newPlan);
    const newGroceries = generateGroceryList(
      newPlan,
      coupleSettings.coupleModeEnabled,
      customPrices,
      userSettings.targetCalories,
      userSettings.partnerCalories
    );
    setGroceryItems(newGroceries);
    setSplitReport(calculateSplitCost(newGroceries, coupleSettings));
  };

  // Appliquer les préférences au menu
  const handleApplyPreferencesToPlan = () => {
    const newPlan = generateWeeklyPlan(preferences);
    setWeeklyPlan(newPlan);
    const newGroceries = generateGroceryList(
      newPlan,
      coupleSettings.coupleModeEnabled,
      customPrices,
      userSettings.targetCalories,
      userSettings.partnerCalories
    );
    const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));
    const merged = newGroceries.map((item) => ({
      ...item,
      checked: checkedMap.get(item.id) || false,
    }));
    setGroceryItems(merged);
    setSplitReport(calculateSplitCost(merged, coupleSettings));
  };

  const handleToggleCoupleMode = () => {
    const updatedSettings: CoupleSettings = {
      ...coupleSettings,
      coupleModeEnabled: !coupleSettings.coupleModeEnabled,
    };
    setCoupleSettings(updatedSettings);

    if (weeklyPlan) {
      const newGroceries = generateGroceryList(
        weeklyPlan,
        updatedSettings.coupleModeEnabled,
        customPrices,
        userSettings.targetCalories,
        userSettings.partnerCalories
      );
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
    const newPlan = generateWeeklyPlan(preferences);
    setWeeklyPlan(newPlan);
    const newGroceries = generateGroceryList(
      newPlan,
      coupleSettings.coupleModeEnabled,
      customPrices,
      userSettings.targetCalories,
      userSettings.partnerCalories
    );
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

    const newGroceries = generateGroceryList(
      updatedPlan,
      coupleSettings.coupleModeEnabled,
      customPrices,
      userSettings.targetCalories,
      userSettings.partnerCalories
    );
    const checkedMap = new Map(groceryItems.map((i) => [i.id, i.checked]));

    const merged = newGroceries.map((item) => ({
      ...item,
      checked: checkedMap.get(item.id) || false,
    }));

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
          isDark ? 'bg-[#0B0C0E] text-stone-300' : 'bg-[#F7F7F6] text-stone-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-stone-800 dark:border-stone-200 border-t-transparent rounded-full animate-spin" />
          <span className="font-serif italic text-base">Composition de votre menu nordique & sportif...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#0B0C0E] text-stone-100' : 'bg-[#F7F7F6] text-stone-900'
      }`}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groceryCount={groceryItems.length}
        coupleModeEnabled={coupleSettings.coupleModeEnabled}
        userSettings={userSettings}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'planner' && (
          <WeeklyPlannerView
            plan={weeklyPlan}
            preferences={preferences}
            userSettings={userSettings}
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
            preferences={preferences}
            userSettings={userSettings}
            isDark={isDark}
            onToggleItem={handleToggleItem}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onClearChecked={handleClearChecked}
            onToggleCoupleMode={handleToggleCoupleMode}
            onUpdatePreference={handleUpdatePreference}
            onUpdateCustomPrice={handleUpdateCustomPrice}
          />
        )}

        {activeTab === 'preferences' && (
          <ProductPreferencesView
            preferences={preferences}
            customPrices={customPrices}
            userSettings={userSettings}
            isDark={isDark}
            onUpdatePreference={handleUpdatePreference}
            onUpdateCustomPrice={handleUpdateCustomPrice}
            onUpdateSettings={handleUpdateSettings}
            onResetAllPreferences={handleResetAllPreferences}
            onApplyPreferencesToPlan={handleApplyPreferencesToPlan}
          />
        )}

        {activeTab === 'tracker' && (
          <CalorieTrackerView
            currentDayPlan={weeklyPlan.days[0]}
            userSettings={userSettings}
            isDark={isDark}
          />
        )}

        {activeTab === 'prices' && (
          <DealsAndPricesView groceryItems={groceryItems} isDark={isDark} />
        )}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        preferences={preferences}
        isDark={isDark}
        onClose={() => setSelectedRecipe(null)}
        onUpdatePreference={handleUpdatePreference}
      />

      <footer
        className={`border-t py-8 text-center text-xs transition-colors ${
          isDark
            ? 'border-white/[0.08] bg-[#0B0C0E] text-stone-500'
            : 'border-stone-200 bg-white/70 text-stone-500'
        }`}
      >
        <p className="font-serif italic text-sm">
          FoodPlanner QC • Conçu pour Metro au Québec • Nutrition sportive {userSettings.targetCalories} kcal & {userSettings.targetProtein}g P • Base de Données SQLite locale
        </p>
      </footer>
    </div>
  );
}
