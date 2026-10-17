'use client';

import React, { useState, useEffect } from 'react';
import { 
  CoupleSettings, 
  GroceryItem, 
  Ingredient,
  MetroAisle, 
  ProductPreferenceStatus, 
  ProductPreferencesMap, 
  Recipe, 
  SplitCostReport, 
  WeeklyPlan,
  CustomPricesMap,
  UserCustomizationSettings,
  DEFAULT_USER_SETTINGS,
  DEFAULT_LAURINE_SETTINGS,
  UserAccount,
  DEFAULT_ACCOUNTS,
  GroceryViewScope
} from '@/types';
import { generateWeeklyPlan, replaceRecipeInPlan } from '@/lib/planner';
import { 
  generateGroceryList, 
  generateCommonGroceryList, 
  calculateCommonListSplit,
  AccountSplitSummary 
} from '@/lib/grocery';
import { DEFAULT_COUPLE_SETTINGS, calculateSplitCost } from '@/lib/couple-split';
import { Header } from '@/components/Header';
import { WeeklyPlannerView } from '@/components/WeeklyPlannerView';
import { RecipeBookView } from '@/components/RecipeBookView';
import { GroceryListView } from '@/components/GroceryListView';
import { DealsAndPricesView } from '@/components/DealsAndPricesView';
import { CalorieTrackerView } from '@/components/CalorieTrackerView';
import { ProductPreferencesView } from '@/components/ProductPreferencesView';
import { RecipeModal } from '@/components/RecipeModal';
import { RecipeCreatorModal } from '@/components/RecipeCreatorModal';
import { BarcodeScannerModal } from '@/components/BarcodeScannerModal';
import { RECIPES } from '@/data/recipes';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'planner' | 'recipes' | 'grocery' | 'prices' | 'tracker' | 'preferences'>('planner');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Produits personnalisés scannés par code-barres (enregistrés dans SQLite)
  const [customProducts, setCustomProducts] = useState<Ingredient[]>([]);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Multi-comptes
  const [accounts, setAccounts] = useState<UserAccount[]>(DEFAULT_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState<string>('ethan');
  const [groceryScope, setGroceryScope] = useState<GroceryViewScope>('common');

  // Données par compte
  const [preferencesByAccount, setPreferencesByAccount] = useState<Record<string, ProductPreferencesMap>>({
    ethan: {},
    laurine: {},
  });
  const [settingsByAccount, setSettingsByAccount] = useState<Record<string, UserCustomizationSettings>>({
    ethan: DEFAULT_USER_SETTINGS,
    laurine: DEFAULT_LAURINE_SETTINGS,
  });
  const [plansByAccount, setPlansByAccount] = useState<Record<string, WeeklyPlan>>({});

  // Recettes personnalisées créées par les utilisateurs dans SQLite
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [isRecipeCreatorOpen, setIsRecipeCreatorOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  // Paramètres globaux & personnalisations
  const [customPrices, setCustomPrices] = useState<CustomPricesMap>({});
  const [customManualItems, setCustomManualItems] = useState<GroceryItem[]>([]);
  const [checkedItemsMap, setCheckedItemsMap] = useState<Record<string, boolean>>({});
  const [coupleSettings, setCoupleSettings] = useState<CoupleSettings>(DEFAULT_COUPLE_SETTINGS);

  const isDark = theme === 'dark';

  // 1. Initialisation au montage avec chargement depuis SQLite
  useEffect(() => {
    // Thème
    const savedTheme = typeof window !== 'undefined' ? (localStorage.getItem('fp_theme') as 'dark' | 'light' | null) : null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Chargement SQLite
    const initAppData = async () => {
      let loadedAccounts = DEFAULT_ACCOUNTS;
      let activeAcc = 'ethan';
      let loadedPrefs: Record<string, ProductPreferencesMap> = { ethan: {}, laurine: {} };
      let loadedSettings: Record<string, UserCustomizationSettings> = {
        ethan: DEFAULT_USER_SETTINGS,
        laurine: DEFAULT_LAURINE_SETTINGS,
      };
      let loadedPrices: CustomPricesMap = {};
      let loadedCustomRecipes: Recipe[] = [];
      let loadedCustomProducts: Ingredient[] = [];

      try {
        const [res, prodRes] = await Promise.all([
          fetch('/api/preferences'),
          fetch('/api/products')
        ]);

        if (res.ok) {
          const data = await res.json();
          if (data.accounts && data.accounts.length > 0) {
            loadedAccounts = data.accounts;
          }
          if (data.activeAccountId) {
            activeAcc = data.activeAccountId;
          }
          if (data.preferences) {
            loadedPrefs = data.preferences;
          }
          if (data.settings) {
            loadedSettings = data.settings;
          }
          if (data.customPrices) {
            loadedPrices = data.customPrices;
          }
          if (data.customRecipes) {
            loadedCustomRecipes = data.customRecipes;
          }
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.products) {
            loadedCustomProducts = prodData.products;
          }
        }
      } catch (err) {
        console.warn('Impossible de charger les données SQLite, fallback local:', err);
      }

      setAccounts(loadedAccounts);
      setActiveAccountId(activeAcc);
      setPreferencesByAccount(loadedPrefs);
      setSettingsByAccount(loadedSettings);
      setCustomPrices(loadedPrices);
      setCustomRecipes(loadedCustomRecipes);
      setCustomProducts(loadedCustomProducts);

      // Générer les plans de chaque compte selon leurs préférences et recettes personnalisées
      const initialPlans: Record<string, WeeklyPlan> = {};
      for (const acc of loadedAccounts) {
        const userPrefs = loadedPrefs[acc.id] || {};
        initialPlans[acc.id] = generateWeeklyPlan(userPrefs, loadedCustomRecipes);
      }
      setPlansByAccount(initialPlans);

      // Mettre à jour coupleSettings pour Ethan & Laurine
      const ethanSett = loadedSettings['ethan'] || DEFAULT_USER_SETTINGS;
      const laurineSett = loadedSettings['laurine'] || loadedSettings['copine'] || DEFAULT_LAURINE_SETTINGS;
      setCoupleSettings({
        coupleModeEnabled: true,
        user1: {
          ...DEFAULT_COUPLE_SETTINGS.user1,
          targetCalories: ethanSett.targetCalories,
          targetProtein: ethanSett.targetProtein,
        },
        user2: {
          ...DEFAULT_COUPLE_SETTINGS.user2,
          name: 'Laurine',
          id: 'laurine',
          targetCalories: laurineSett.targetCalories,
          targetProtein: laurineSett.targetProtein,
        },
      });
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

  // Profil et réglages actifs
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0] || DEFAULT_ACCOUNTS[0];
  const activeSettings = settingsByAccount[activeAccountId] || DEFAULT_USER_SETTINGS;
  const activePreferences = preferencesByAccount[activeAccountId] || {};
  const activePlan = plansByAccount[activeAccountId] || plansByAccount['ethan'];

  // --- ACTIONS MULTI-COMPTES ---

  const handleSwitchAccount = async (newAccountId: string) => {
    setActiveAccountId(newAccountId);

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_account', accountId: newAccountId }),
      });
    } catch (err) {
      console.error('Erreur switch account SQLite:', err);
    }
  };

  const handleRenameAccount = async (accountId: string, newName: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === accountId
          ? { ...a, name: newName, avatarInitials: newName.substring(0, 2).toUpperCase() }
          : a
      )
    );

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_account', accountId, name: newName }),
      });
    } catch (err) {
      console.error('Erreur rename account SQLite:', err);
    }
  };

  const handleCreateAccount = async (name: string) => {
    const cleanId = name.toLowerCase().replace(/[^a-z0-9_-]/g, '') || `user_${Date.now()}`;
    const newAcc: UserAccount = {
      id: cleanId,
      name,
      avatarInitials: name.substring(0, 2).toUpperCase(),
    };

    setAccounts((prev) => [...prev, newAcc]);
    const defaultSett = { ...DEFAULT_LAURINE_SETTINGS, goalName: 'Alimentation saine & équilibrée' };
    setSettingsByAccount((prev) => ({ ...prev, [cleanId]: defaultSett }));
    setPreferencesByAccount((prev) => ({ ...prev, [cleanId]: {} }));
    const newPlan = generateWeeklyPlan({}, customRecipes);
    setPlansByAccount((prev) => ({ ...prev, [cleanId]: newPlan }));
    setActiveAccountId(cleanId);

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_account', id: cleanId, name }),
      });
    } catch (err) {
      console.error('Erreur create account SQLite:', err);
    }
  };

  // --- GESTION DES PRÉFÉRENCES (PAR COMPTE) ---

  const handleUpdatePreference = async (ingredientId: string, status: ProductPreferenceStatus) => {
    const currentPrefs = preferencesByAccount[activeAccountId] || {};
    const nextPrefs: ProductPreferencesMap = { ...currentPrefs };
    if (status === 'neutral') {
      delete nextPrefs[ingredientId];
    } else {
      nextPrefs[ingredientId] = status;
    }

    setPreferencesByAccount((prev) => ({
      ...prev,
      [activeAccountId]: nextPrefs,
    }));

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_preference',
          accountId: activeAccountId,
          ingredientId,
          status,
        }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde preference SQLite:', err);
    }

    // Si banni, réadapter immédiatement le plan du compte actif
    if (status === 'disliked') {
      const newPlan = generateWeeklyPlan(nextPrefs, customRecipes);
      setPlansByAccount((prev) => ({
        ...prev,
        [activeAccountId]: newPlan,
      }));
    }
  };

  const handleResetAllPreferences = async () => {
    setPreferencesByAccount((prev) => ({
      ...prev,
      [activeAccountId]: {},
    }));

    try {
      const keys = Object.keys(preferencesByAccount[activeAccountId] || {});
      await Promise.all(
        keys.map((id) =>
          fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'set_preference',
              accountId: activeAccountId,
              ingredientId: id,
              status: 'neutral',
            }),
          })
        )
      );
    } catch (err) {
      console.error('Erreur reset preferences SQLite:', err);
    }

    const newPlan = generateWeeklyPlan({}, customRecipes);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: newPlan,
    }));
  };

  const handleApplyPreferencesToPlan = () => {
    const prefs = preferencesByAccount[activeAccountId] || {};
    const newPlan = generateWeeklyPlan(prefs, customRecipes);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: newPlan,
    }));
  };

  // --- GESTION DES RÉGLAGES (PAR COMPTE) ---

  const handleUpdateSettings = async (newSettings: Partial<UserCustomizationSettings>) => {
    const currentSettings = settingsByAccount[activeAccountId] || DEFAULT_USER_SETTINGS;
    const mergedSettings: UserCustomizationSettings = {
      ...currentSettings,
      ...newSettings,
    };

    setSettingsByAccount((prev) => ({
      ...prev,
      [activeAccountId]: mergedSettings,
    }));

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_settings',
          accountId: activeAccountId,
          settings: mergedSettings,
        }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde settings SQLite:', err);
    }
  };

  // --- GESTION DES PRIX PERSONNALISÉS ---

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
  };

  // --- GESTION DES RECETTES ET REPAS MAISON (SQLITE) ---

  const handleSaveCustomRecipe = (savedRecipe: Recipe) => {
    const updatedRecipes = customRecipes.some((r) => r.id === savedRecipe.id)
      ? customRecipes.map((r) => (r.id === savedRecipe.id ? savedRecipe : r))
      : [savedRecipe, ...customRecipes];

    setCustomRecipes(updatedRecipes);

    // Mettre à jour le plan hebdomadaire pour intégrer le repas
    const prefs = preferencesByAccount[activeAccountId] || {};
    const newPlan = generateWeeklyPlan(prefs, updatedRecipes);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: newPlan,
    }));
  };

  const handleDeleteCustomRecipe = (recipeId: string) => {
    const remaining = customRecipes.filter((r) => r.id !== recipeId);
    setCustomRecipes(remaining);

    const prefs = preferencesByAccount[activeAccountId] || {};
    const newPlan = generateWeeklyPlan(prefs, remaining);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: newPlan,
    }));
  };

  // --- GESTION DES PRODUITS PERSONNALISÉS (CODE-BARRES SQLITE) ---

  const handleProductAddedFromBarcode = (product: Ingredient) => {
    setCustomProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => (p.id === product.id ? product : p));
      }
      return [product, ...prev];
    });
  };

  const handleDeleteCustomProduct = async (productId: string) => {
    setCustomProducts((prev) => prev.filter((p) => p.id !== productId));
    try {
      await fetch(`/api/products?id=${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Erreur suppression produit personnalisé:', err);
    }
  };

  // --- GESTION DU PLANIFICATEUR ---

  const handleRegenerateAll = () => {
    const prefs = preferencesByAccount[activeAccountId] || {};
    const newPlan = generateWeeklyPlan(prefs, customRecipes);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: newPlan,
    }));
  };

  const allRecipes = React.useMemo(() => {
    return [...RECIPES, ...(customRecipes || [])];
  }, [customRecipes]);

  const handleReplaceRecipe = (
    dayIndex: number,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    newRecipeId: string
  ) => {
    if (!activePlan) return;
    const updatedPlan = replaceRecipeInPlan(activePlan, dayIndex, mealType, newRecipeId, customRecipes);
    setPlansByAccount((prev) => ({
      ...prev,
      [activeAccountId]: updatedPlan,
    }));
  };

  const handlePlanRecipeToDay = (
    dayIndex: number,
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    recipeId: string
  ) => {
    handleReplaceRecipe(dayIndex, mealSlot, recipeId);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setRecipeToEdit(recipe);
    setIsRecipeCreatorOpen(true);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('Supprimer définitivement ce plat de votre base de données ?')) return;
    try {
      const res = await fetch(`/api/recipes?id=${encodeURIComponent(recipeId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        handleDeleteCustomRecipe(recipeId);
      }
    } catch (err) {
      console.error('Erreur suppression recette SQLite:', err);
    }
  };

  // --- GESTION DE LA LISTE D'ÉPICERIE (COMMUNE VS INDIVIDUELLE) ---

  const handleToggleItem = (id: string) => {
    setCheckedItemsMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleClearChecked = () => {
    setCheckedItemsMap({});
  };

  const handleAddItem = (
    name: string,
    aisle: MetroAisle,
    packageDescription: string,
    isTaxable = false,
    price = 0,
    forAccount = 'common'
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
      forAccount,
      neededBy: forAccount === 'common' ? accounts.map((a) => a.id) : [forAccount],
    };
    setCustomManualItems((prev) => [newItem, ...prev]);
  };

  const handleRemoveItem = (id: string) => {
    setCustomManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleCoupleMode = () => {
    setCoupleSettings((prev) => ({
      ...prev,
      coupleModeEnabled: !prev.coupleModeEnabled,
    }));
  };

  // --- CALCUL DES ARTICLES DE LA LISTE D'ÉPICERIE SELON LE SCOPE (HOOKS INCONDITIONNELS) ---

  // 1. Liste Commune consolidée (Tous les profils réunis avec fusion des paquets)
  const commonAccountPlans = React.useMemo(() => {
    if (!activePlan) return [];
    return accounts.map((acc) => ({
      accountId: acc.id,
      accountName: acc.name,
      plan: plansByAccount[acc.id] || activePlan,
    }));
  }, [accounts, plansByAccount, activePlan]);

  const commonGroceryItems = React.useMemo(() => {
    if (commonAccountPlans.length === 0) return [];
    return generateCommonGroceryList(commonAccountPlans, customPrices, customProducts);
  }, [commonAccountPlans, customPrices, customProducts]);

  const commonItemsWithCustom = React.useMemo(() => {
    return [
      ...customManualItems.filter((i) => !i.forAccount || i.forAccount === 'common' || accounts.some(a => a.id === i.forAccount)),
      ...commonGroceryItems,
    ].map((item) => ({
      ...item,
      checked: checkedItemsMap[item.id] || false,
    }));
  }, [customManualItems, accounts, commonGroceryItems, checkedItemsMap]);

  const commonSplitReport = React.useMemo(() => {
    return calculateCommonListSplit(commonItemsWithCustom, accounts);
  }, [commonItemsWithCustom, accounts]);

  // 2. Détermination des articles visibles selon le scope
  const displayedGroceryItems = React.useMemo<GroceryItem[]>(() => {
    if (!activePlan) return [];
    if (groceryScope === 'common') {
      return commonItemsWithCustom;
    }
    const targetAccId = groceryScope;
    const targetPlan = plansByAccount[targetAccId] || activePlan;
    const targetSettings = settingsByAccount[targetAccId] || activeSettings;
    const baseIndividualList = generateGroceryList(
      targetPlan,
      false,
      customPrices,
      targetSettings?.targetCalories,
      targetSettings?.partnerCalories,
      customProducts
    );
    const manualForTarget = customManualItems.filter(
      (i) => i.forAccount === targetAccId || i.forAccount === 'common'
    );
    return [...manualForTarget, ...baseIndividualList].map((item) => ({
      ...item,
      checked: checkedItemsMap[item.id] || false,
    }));
  }, [groceryScope, commonItemsWithCustom, plansByAccount, activePlan, settingsByAccount, activeSettings, customPrices, customProducts, customManualItems, checkedItemsMap]);

  // Calcul du split rétrocompatible pour la vue couple
  const singleSplitReport: SplitCostReport = React.useMemo(() => {
    return calculateSplitCost(displayedGroceryItems, coupleSettings);
  }, [displayedGroceryItems, coupleSettings]);

  // Attente du chargement initial des plans (Placé APRÈS tous les hooks)
  if (Object.keys(plansByAccount).length === 0 || !activePlan) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors ${
          isDark ? 'bg-[#0B0C0E] text-stone-300' : 'bg-[#F7F7F6] text-stone-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-stone-800 dark:border-stone-200 border-t-transparent rounded-full animate-spin" />
          <span className="font-serif italic text-base">Chargement des profils & menus d'épicerie...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 w-full overflow-x-hidden ${
        isDark ? 'bg-[#0B0C0E] text-stone-100' : 'bg-[#F7F7F6] text-stone-900'
      }`}
    >
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        groceryCount={displayedGroceryItems.length}
        coupleModeEnabled={coupleSettings.coupleModeEnabled}
        userSettings={activeSettings}
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSwitchAccount={handleSwitchAccount}
        onRenameAccount={handleRenameAccount}
        onCreateAccount={handleCreateAccount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 max-w-[1536px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'planner' && (
          <WeeklyPlannerView
            plan={activePlan}
            preferences={activePreferences}
            userSettings={activeSettings}
            customRecipes={customRecipes}
            isDark={isDark}
            onRegenerateAll={handleRegenerateAll}
            onReplaceRecipe={handleReplaceRecipe}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onOpenRecipeCreator={() => {
              setRecipeToEdit(null);
              setIsRecipeCreatorOpen(true);
            }}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeBookView
            allRecipes={allRecipes}
            customRecipes={customRecipes}
            preferences={activePreferences}
            isDark={isDark}
            onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
            onOpenRecipeCreator={() => {
              setRecipeToEdit(null);
              setIsRecipeCreatorOpen(true);
            }}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onEditRecipe={handleEditRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            onPlanRecipeToDay={handlePlanRecipeToDay}
          />
        )}

        {activeTab === 'grocery' && (
          <GroceryListView
            items={displayedGroceryItems}
            coupleSettings={coupleSettings}
            splitReport={singleSplitReport}
            preferences={activePreferences}
            userSettings={activeSettings}
            accounts={accounts}
            activeAccountId={activeAccountId}
            scope={groceryScope}
            commonSplitReport={commonSplitReport}
            isDark={isDark}
            onToggleItem={handleToggleItem}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onClearChecked={handleClearChecked}
            onToggleCoupleMode={handleToggleCoupleMode}
            onScopeChange={setGroceryScope}
            onUpdatePreference={handleUpdatePreference}
            onUpdateCustomPrice={handleUpdateCustomPrice}
          />
        )}

        {activeTab === 'preferences' && (
          <ProductPreferencesView
            preferences={activePreferences}
            customPrices={customPrices}
            userSettings={activeSettings}
            accounts={accounts}
            activeAccountId={activeAccountId}
            isDark={isDark}
            customProducts={customProducts}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onDeleteCustomProduct={handleDeleteCustomProduct}
            onUpdatePreference={handleUpdatePreference}
            onUpdateCustomPrice={handleUpdateCustomPrice}
            onUpdateSettings={handleUpdateSettings}
            onSwitchAccount={handleSwitchAccount}
            onResetAllPreferences={handleResetAllPreferences}
            onApplyPreferencesToPlan={handleApplyPreferencesToPlan}
          />
        )}

        {activeTab === 'tracker' && (
          <CalorieTrackerView
            currentDayPlan={activePlan.days[0]}
            userSettings={activeSettings}
            isDark={isDark}
          />
        )}

        {activeTab === 'prices' && (
          <DealsAndPricesView
            groceryItems={displayedGroceryItems}
            isDark={isDark}
            customProducts={customProducts}
            customPrices={customPrices}
            userSettings={activeSettings}
          />
        )}
      </main>

      <RecipeModal
        recipe={selectedRecipe}
        preferences={activePreferences}
        isDark={isDark}
        onClose={() => setSelectedRecipe(null)}
        onUpdatePreference={handleUpdatePreference}
        onEditCustomRecipe={(recipe) => {
          setRecipeToEdit(recipe);
          setIsRecipeCreatorOpen(true);
        }}
      />

      <RecipeCreatorModal
        isOpen={isRecipeCreatorOpen}
        onClose={() => {
          setIsRecipeCreatorOpen(false);
          setRecipeToEdit(null);
        }}
        recipeToEdit={recipeToEdit}
        onSaveRecipe={handleSaveCustomRecipe}
        onDeleteRecipe={handleDeleteCustomRecipe}
        isDark={isDark}
        activeAccountId={activeAccountId}
        customProducts={customProducts}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        onProductAdded={handleProductAddedFromBarcode}
        isDark={isDark}
      />

      <footer
        className={`border-t py-8 text-center text-xs transition-colors ${
          isDark
            ? 'border-white/[0.08] bg-[#0B0C0E] text-stone-500'
            : 'border-stone-200 bg-white/70 text-stone-500'
        }`}
      >
        <p className="font-serif italic text-sm">
          FoodPlanner QC • Profil : {activeAccount.name} ({activeSettings.targetCalories} kcal & {activeSettings.targetProtein}g P) • Base de Données SQLite locale
        </p>
      </footer>
    </div>
  );
}
