'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { ProductCreatorModal } from '@/components/ProductCreatorModal';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';

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
  const [plansByAccount, setPlansByAccount] = useState<Record<string, WeeklyPlan>>(() => ({
    ethan: generateWeeklyPlan({}, []),
    laurine: generateWeeklyPlan({}, []),
  }));

  // Recettes personnalisées créées par les utilisateurs dans SQLite
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [isRecipeCreatorOpen, setIsRecipeCreatorOpen] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);

  // Paramètres globaux & personnalisations
  const [customPrices, setCustomPrices] = useState<CustomPricesMap>({});
  const [customManualItems, setCustomManualItems] = useState<GroceryItem[]>([]);
  const [checkedItemsMap, setCheckedItemsMap] = useState<Record<string, boolean>>({});
  const [coupleSettings, setCoupleSettings] = useState<CoupleSettings>(DEFAULT_COUPLE_SETTINGS);
  const [pantryMap, setPantryMap] = useState<Record<string, boolean>>({});
  const [isProductCreatorOpen, setIsProductCreatorOpen] = useState(false);

  const isDark = theme === 'dark';

  // Chargement SQLite
  const initAppData = useCallback(async () => {
    try {
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
      let loadedPantry: Record<string, boolean> = {};
      let loadedGroceryItems: GroceryItem[] = [];

      try {
        const [res, prodRes, pantryRes, groceryRes] = await Promise.all([
          fetch('/api/preferences'),
          fetch('/api/products'),
          fetch('/api/pantry'),
          fetch('/api/grocery'),
        ]);

        if (res.ok) {
          const data = await res.json();
          if (data.accounts && Array.isArray(data.accounts) && data.accounts.length > 0) {
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
          if (data.customRecipes && Array.isArray(data.customRecipes)) {
            loadedCustomRecipes = data.customRecipes;
          }
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.products && Array.isArray(prodData.products)) {
            loadedCustomProducts = prodData.products;
          }
        }

        if (pantryRes.ok) {
          const pantryData = await pantryRes.json();
          if (pantryData.pantry) {
            loadedPantry = pantryData.pantry;
          }
        }

        if (groceryRes.ok) {
          const groceryData = await groceryRes.json();
          if (groceryData.items && Array.isArray(groceryData.items)) {
            loadedGroceryItems = groceryData.items;
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
      setPantryMap(loadedPantry);
      setCustomManualItems(loadedGroceryItems);

      const initialChecked: Record<string, boolean> = {};
      for (const item of loadedGroceryItems) {
        if (item.checked) initialChecked[item.id] = true;
      }
      setCheckedItemsMap((prev) => ({ ...initialChecked, ...prev }));

      // Générer les plans de chaque compte selon leurs préférences et recettes personnalisées
      const initialPlans: Record<string, WeeklyPlan> = {};
      for (const acc of loadedAccounts) {
        const userPrefs = loadedPrefs[acc.id] || {};
        initialPlans[acc.id] = generateWeeklyPlan(userPrefs, loadedCustomRecipes);
      }
      if (!initialPlans['ethan']) {
        initialPlans['ethan'] = generateWeeklyPlan(loadedPrefs['ethan'] || {}, loadedCustomRecipes);
      }
      if (!initialPlans['laurine']) {
        initialPlans['laurine'] = generateWeeklyPlan(loadedPrefs['laurine'] || {}, loadedCustomRecipes);
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
    } catch (fatalErr) {
      console.error('Erreur critique dans initAppData:', fatalErr);
    }
  }, []);

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

    initAppData();
  }, [initAppData]);

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
  const activeSettings = settingsByAccount[activeAccountId] || settingsByAccount['ethan'] || DEFAULT_USER_SETTINGS;
  const activePreferences = preferencesByAccount[activeAccountId] || preferencesByAccount['ethan'] || {};
  const activePlan = plansByAccount[activeAccountId] || plansByAccount['ethan'] || Object.values(plansByAccount)[0] || generateWeeklyPlan({}, []);

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

  const handleCloseRecipeCreator = useCallback(() => {
    setIsRecipeCreatorOpen(false);
    setRecipeToEdit(null);
  }, []);

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

  const handleToggleItem = async (id: string) => {
    setCheckedItemsMap((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

    if (id.startsWith('custom_')) {
      try {
        await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_check', id }),
        });
      } catch (err) {
        console.error('Erreur sync check grocery item:', err);
      }
    }
  };

  const handleClearChecked = async () => {
    setCheckedItemsMap({});
    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_checked' }),
      });
    } catch (err) {
      console.error('Erreur clear checked grocery:', err);
    }
  };

  const handleAddItem = async (
    name: string,
    aisle: MetroAisle,
    packageDescription: string,
    isTaxable = false,
    price = 0,
    forAccount = 'common'
  ) => {
    const newItem: GroceryItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', item: newItem }),
      });
    } catch (err) {
      console.error('Erreur sauvegarde custom grocery item:', err);
    }
  };

  const handleRemoveItem = async (id: string) => {
    setCustomManualItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
    } catch (err) {
      console.error('Erreur suppression custom grocery item:', err);
    }
  };

  const handleTogglePantry = async (ingredientId: string) => {
    const nextVal = !pantryMap[ingredientId];
    setPantryMap((prev) => ({
      ...prev,
      [ingredientId]: nextVal,
    }));

    try {
      await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredientId, isInPantry: nextVal }),
      });
    } catch (err) {
      console.error('Erreur toggle pantry SQLite:', err);
    }
  };

  const handleAddToGroceryFromCatalog = (ingredient: Ingredient, forAccount = 'common') => {
    handleAddItem(
      ingredient.name,
      ingredient.aisle,
      ingredient.packaging?.label || `${ingredient.packaging?.amount || 1}${ingredient.packaging?.unit || 'u'}`,
      ingredient.packaging?.isTaxable ?? false,
      ingredient.packaging?.exactPriceMetro ?? 0,
      forAccount
    );
  };

  const handleProductCreated = (product: Ingredient) => {
    setCustomProducts((prev) => [product, ...prev.filter((p) => p.id !== product.id)]);
  };

  const handleToggleCoupleMode = () => {
    setCoupleSettings((prev) => ({
      ...prev,
      coupleModeEnabled: !prev.coupleModeEnabled,
    }));
  };

  // Catalogue complet d'ingrédients (statiques + créés par l'utilisateur)
  const allCatalogIngredients = React.useMemo(() => {
    const customMap: Record<string, Ingredient> = Object.fromEntries(
      (customProducts || []).map((p: Ingredient) => [p.id, p])
    );
    return Object.values({ ...INGREDIENTS, ...customMap });
  }, [customProducts]);

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
    return generateCommonGroceryList(commonAccountPlans, customPrices, customProducts, pantryMap);
  }, [commonAccountPlans, customPrices, customProducts, pantryMap]);

  // Le calcul du split dépend UNIQUEMENT des prix et besoins des paquets, JAMAIS de l'état coché !
  const baseCommonItems = React.useMemo(() => {
    return [
      ...customManualItems.filter((i) => !i.forAccount || i.forAccount === 'common' || accounts.some(a => a.id === i.forAccount)),
      ...commonGroceryItems,
    ];
  }, [customManualItems, accounts, commonGroceryItems]);

  const commonSplitReport = React.useMemo(() => {
    return calculateCommonListSplit(baseCommonItems, accounts);
  }, [baseCommonItems, accounts]);

  const commonItemsWithCustom = React.useMemo(() => {
    return baseCommonItems.map((item) => ({
      ...item,
      checked: checkedItemsMap[item.id] || false,
    }));
  }, [baseCommonItems, checkedItemsMap]);

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
      customProducts,
      pantryMap
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

  return (
    <div
      className={`min-h-screen flex flex-col font-sans w-full overflow-x-hidden ${isDark ? 'bg-[#0B0C0E] text-stone-100' : 'bg-[#F7F7F6] text-stone-900'
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
        onBackupRestored={initAppData}
      />

      <main className="flex-1 max-w-[1536px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
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
            allCatalogIngredients={allCatalogIngredients}
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
            pantryMap={pantryMap}
            onOpenBarcodeModal={() => setIsBarcodeModalOpen(true)}
            onOpenProductCreator={() => setIsProductCreatorOpen(true)}
            onDeleteCustomProduct={handleDeleteCustomProduct}
            onTogglePantry={handleTogglePantry}
            onAddToGroceryList={handleAddToGroceryFromCatalog}
            onBackupRestored={initAppData}
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
        onClose={handleCloseRecipeCreator}
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

      <ProductCreatorModal
        isOpen={isProductCreatorOpen}
        onClose={() => setIsProductCreatorOpen(false)}
        onProductCreated={handleProductCreated}
        isDark={isDark}
      />

      <footer
        className={`border-t py-8 pb-24 md:pb-8 text-center text-xs transition-colors ${isDark
            ? 'border-white/[0.08] bg-[#0B0C0E] text-stone-500'
            : 'border-stone-200 bg-white/70 text-stone-500'
          }`}
      >
        <p className="font-serif italic text-sm">
          FoodPlanner • Profil : {activeAccount.name} ({activeSettings.targetCalories} kcal & {activeSettings.targetProtein}g P) • Base de Données SQLite locale
        </p>
      </footer>
    </div>
  );
}
