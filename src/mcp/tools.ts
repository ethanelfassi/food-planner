import { z } from 'zod';
import {
  saveCustomRecipe,
  deleteCustomRecipe,
  getCustomRecipeById,
  getAllCustomRecipes,
  getScheduledMeals,
  setScheduledMeal,
  deleteScheduledMeal,
  clearDaySchedule,
  setCustomPrice,
  getAllCustomPrices,
  setAccountPreference,
  getPreferencesForAccount,
  saveCustomProduct,
  deleteCustomProduct,
  getCustomProducts,
  getPantryMap,
  setPantryItem,
  getCustomGroceryItems,
  saveCustomGroceryItem,
  deleteCustomGroceryItem,
  getAllAccounts,
  getActiveAccountId,
  getSettingsForAccount,
} from '@/lib/db';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';
import { generateWeeklyPlan } from '@/lib/planner';
import { calculateRecipeNutrients } from '@/lib/nutrition';
import { generateCommonGroceryList, generateGroceryList, calculateReceiptTaxes } from '@/lib/grocery';
import { Ingredient, Recipe, MetroAisle, MealType } from '@/types';

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function parseDayIndex(input: number | string): number {
  if (typeof input === 'number') {
    return Math.max(0, Math.min(6, Math.floor(input)));
  }
  const clean = input.trim().toLowerCase();
  const idx = DAY_NAMES.findIndex((d) => d.toLowerCase() === clean);
  if (idx !== -1) return idx;
  const num = parseInt(clean, 10);
  if (!isNaN(num)) return Math.max(0, Math.min(6, num));
  return 0;
}

function parseRecipeMealType(type?: string): 'dejeuner' | 'diner' | 'souper' | 'collation' {
  if (!type) return 'diner';
  const t = type.toLowerCase().trim();
  if (t === 'breakfast' || t === 'dejeuner' || t === 'déjeuner') return 'dejeuner';
  if (t === 'lunch' || t === 'diner' || t === 'dîner') return 'diner';
  if (t === 'dinner' || t === 'souper') return 'souper';
  if (t === 'snack' || t === 'collation') return 'collation';
  return 'diner';
}

function parseMealSlot(slot?: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (!slot) return 'lunch';
  const s = slot.toLowerCase().trim();
  if (s === 'dejeuner' || s === 'déjeuner' || s === 'breakfast') return 'breakfast';
  if (s === 'diner' || s === 'dîner' || s === 'lunch') return 'lunch';
  if (s === 'souper' || s === 'dinner') return 'dinner';
  if (s === 'collation' || s === 'snack') return 'snack';
  return 'lunch';
}

function getMergedCatalog(): Record<string, Ingredient> {
  const customProducts = getCustomProducts();
  const customMap = Object.fromEntries(customProducts.map((p) => [p.id, p]));
  return { ...INGREDIENTS, ...customMap };
}

function getAllAvailableRecipes(): Recipe[] {
  const customRecipes = getAllCustomRecipes();
  return [...RECIPES, ...customRecipes];
}

// ==========================================
// OUTILS SANS VALIDATION HUMAINE (Ajout / Modif sûre / Lecture)
// ==========================================

export const toolSchemas = {
  // 1. Créer une recette
  create_recipe: {
    name: 'create_recipe',
    description: 'Créer une nouvelle recette personnalisée avec ingrédients, étapes et calcul automatique des macros.',
    requiresConfirmation: false,
    schema: z.object({
      title: z.string().describe('Nom de la recette (ex: "Poulet Tikka Masala Maison")'),
      mealType: z.string().default('diner').describe('Type de repas ("dejeuner", "diner", "souper", "collation" ou breakfast, lunch, dinner, snack)'),
      prepTimeMinutes: z.number().default(15).describe('Temps de préparation en minutes'),
      cookTimeMinutes: z.number().default(20).describe('Temps de cuisson en minutes'),
      servings: z.number().default(1).describe('Nombre de portions'),
      ingredients: z.array(
        z.object({
          ingredientId: z.string().optional().describe('ID de l\'ingrédient (ex: "blanc_poulet", "riz_basmati") ou nom exact'),
          name: z.string().optional().describe('Nom de l\'ingrédient si ID non renseigné'),
          quantity: z.union([z.number(), z.string()]).describe('Quantité numérique (ex: 200)'),
          unit: z.string().optional().describe('Unité (g, ml, unite, canne, c_a_soupe)'),
        })
      ).describe('Liste des ingrédients'),
      instructions: z.array(z.string()).default([]).describe('Étapes de préparation'),
      tags: z.array(z.string()).default(['fait-maison']).describe('Tags ou étiquettes'),
      createdBy: z.string().default('ethan').describe('Identifiant du créateur ("ethan" ou "laurine")'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      const resolvedMealType = parseRecipeMealType(args.mealType);
      // Résoudre les ingredientId si l'IA a passé un nom au lieu d'un ID
      const resolvedIngredients = args.ingredients.map((ing: any) => {
        let raw = (ing.ingredientId || ing.name || ing.id || '').trim();
        let id = raw;
        if (!catalog[id]) {
          const match = Object.values(catalog).find(
            (c) => c.name.toLowerCase() === raw.toLowerCase() || c.id.toLowerCase() === raw.toLowerCase()
          );
          if (match) id = match.id;
        }
        const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity) || 1;
        return {
          ingredientId: id || 'custom_item',
          quantity: qty,
          unit: ing.unit || catalog[id]?.baseUnit || 'g',
        };
      });

      const nutrients = calculateRecipeNutrients(resolvedIngredients, args.servings, catalog);

      const created = saveCustomRecipe({
        title: args.title,
        mealType: resolvedMealType,
        prepTimeMinutes: args.prepTimeMinutes,
        cookTimeMinutes: args.cookTimeMinutes,
        servings: args.servings,
        ingredients: resolvedIngredients,
        instructions: args.instructions,
        tags: args.tags,
        createdBy: args.createdBy,
        caloriesPerServing: nutrients.caloriesPerServing,
        proteinPerServing: nutrients.proteinPerServing,
        carbsPerServing: nutrients.carbsPerServing,
        fatPerServing: nutrients.fatPerServing,
      });

      return {
        message: `✅ Recette « ${created.title} » créée avec succès !`,
        recipe: {
          id: created.id,
          title: created.title,
          mealType: created.mealType,
          servings: created.servings,
          macrosPerServing: {
            calories: created.caloriesPerServing,
            protein: `${created.proteinPerServing}g`,
            carbs: `${created.carbsPerServing}g`,
            fat: `${created.fatPerServing}g`,
          },
          ingredientsCount: created.ingredients.length,
        },
      };
    },
  },

  // 2. Ajouter un plat à la programmation
  schedule_meal: {
    name: 'schedule_meal',
    description: 'Programmer un plat à un créneau précis de la semaine pour Ethan ou Laurine.',
    requiresConfirmation: false,
    schema: z.object({
      accountId: z.enum(['ethan', 'laurine']).default('ethan').describe('Compte cible'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour (0-6 ou "Lundi", "Mardi", etc.)'),
      mealSlot: z.string().describe('Créneau du repas (breakfast/dejeuner, lunch/diner, dinner/souper, snack/collation)'),
      recipeId: z.string().describe('ID de la recette ou titre approchant'),
    }),
    execute: async (args: any) => {
      const dayIndex = parseDayIndex(args.day);
      const slot = parseMealSlot(args.mealSlot);
      const allRecipes = getAllAvailableRecipes();
      let recipe = allRecipes.find((r) => r.id === args.recipeId);
      if (!recipe) {
        recipe = allRecipes.find((r) => r.title.toLowerCase().includes(args.recipeId.toLowerCase()));
      }
      if (!recipe) {
        throw new Error(`Aucune recette trouvée avec l'identifiant ou le titre « ${args.recipeId} »`);
      }

      setScheduledMeal(args.accountId, dayIndex, slot, recipe.id);
      return {
        message: `✅ Plat « ${recipe.title} » programmé pour ${args.accountId} le ${DAY_NAMES[dayIndex]} (${slot}).`,
        schedule: {
          accountId: args.accountId,
          day: DAY_NAMES[dayIndex],
          mealSlot: slot,
          recipe: { id: recipe.id, title: recipe.title, calories: recipe.caloriesPerServing, protein: recipe.proteinPerServing },
        },
      };
    },
  },

  // 3. Modifier le prix d'un aliment
  update_catalog_item_price: {
    name: 'update_catalog_item_price',
    description: 'Modifier le prix d\'achat personnalisé d\'un aliment du catalogue.',
    requiresConfirmation: false,
    schema: z.object({
      ingredientId: z.string().describe('ID de l\'aliment (ex: "flocons_avoine", "blanc_poulet") ou nom'),
      customPrice: z.number().nullable().describe('Nouveau prix en $ CAD (passer null pour réinitialiser au prix officiel Metro)'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      let id = args.ingredientId;
      if (!catalog[id]) {
        const match = Object.values(catalog).find((c) => c.name.toLowerCase() === id.toLowerCase());
        if (match) id = match.id;
      }
      const item = catalog[id];
      if (!item) {
        throw new Error(`Aliment introuvable avec l'identifiant « ${args.ingredientId} »`);
      }

      setCustomPrice(id, args.customPrice);
      return {
        message: args.customPrice !== null
          ? `✅ Prix personnalisé de « ${item.name} » fixé à ${args.customPrice.toFixed(2)} $ CAD.`
          : `✅ Prix de « ${item.name} » rétabli au tarif officiel Metro (${item.packaging.exactPriceMetro.toFixed(2)} $).`,
        ingredientId: id,
        name: item.name,
        newPrice: args.customPrice ?? item.packaging.exactPriceMetro,
      };
    },
  },

  // 4. Ajouter un aliment au catalogue
  add_custom_product: {
    name: 'add_custom_product',
    description: 'Ajouter un nouvel aliment personnalisé au catalogue avec prix, format et macros pour 100g.',
    requiresConfirmation: false,
    schema: z.object({
      name: z.string().describe('Nom du produit (ex: "Tofu ferme biologique")'),
      aisle: z.enum([
        'FRUITS_ET_LEGUMES',
        'BOUCHERIE_ET_POISSONNERIE',
        'PRODUITS_LAITIERS_ET_OEUFS',
        'BOULANGERIE',
        'EPICERIE',
        'SURGELES',
        'DIVERS',
      ]).default('EPICERIE').describe('Rayon d\'épicerie'),
      price: z.number().describe('Prix en magasin ($ CAD)'),
      amount: z.number().default(100).describe('Quantité dans l\'emballage (ex: 450)'),
      unit: z.enum(['g', 'ml', 'unite']).default('g').describe('Unité de mesure'),
      packageLabel: z.string().optional().describe('Description de l\'emballage (ex: "Bloc de 454g")'),
      caloriesPer100g: z.number().describe('Calories pour 100g/100ml'),
      proteinPer100g: z.number().describe('Protéines pour 100g/100ml'),
      carbsPer100g: z.number().default(0).describe('Glucides pour 100g/100ml'),
      fatPer100g: z.number().default(0).describe('Lipides pour 100g/100ml'),
      barcode: z.string().optional().describe('Code-barres EAN/UPC'),
      isTaxable: z.boolean().default(false).describe('Taxable à 14.975% (TPS/TVQ) ou détaxé (aliments de base)'),
    }),
    execute: async (args: any) => {
      const saved = saveCustomProduct({
        name: args.name,
        aisle: args.aisle as MetroAisle,
        packaging: {
          amount: args.amount,
          unit: args.unit,
          label: args.packageLabel || `${args.amount}${args.unit}`,
          regularPriceMetro: args.price,
          exactPriceMetro: args.price,
          unitPricePer100g: args.amount > 0 ? (args.price / (args.amount / 100)) : 0,
          unitPriceLabel: `${args.price.toFixed(2)} $ / emballage`,
          priceMaxi: args.price,
          priceSuperC: args.price,
          priceIGA: args.price,
          isTaxable: args.isTaxable,
          isMoiMemberPrice: false,
        },
        macrosPer100g: {
          calories: args.caloriesPer100g,
          protein: args.proteinPer100g,
          carbs: args.carbsPer100g,
          fat: args.fatPer100g,
        },
        barcode: args.barcode,
      });

      return {
        message: `✅ Aliment « ${saved.name} » ajouté au catalogue !`,
        product: {
          id: saved.id,
          name: saved.name,
          aisle: saved.aisle,
          price: `${saved.packaging.exactPriceMetro.toFixed(2)} $`,
          macrosPer100g: saved.macrosPer100g,
        },
      };
    },
  },

  // 5. Consulter le plan de la semaine ou du jour
  get_daily_plan: {
    name: 'get_daily_plan',
    description: 'Consulter le menu et les repas programmés pour un compte (Ethan ou Laurine) pour un jour ou toute la semaine.',
    requiresConfirmation: false,
    schema: z.object({
      accountId: z.enum(['ethan', 'laurine']).default('ethan').describe('Compte utilisateur'),
      day: z.union([z.number().min(0).max(6), z.string()]).optional().describe('Jour (ex: "Lundi" ou 0-6). Omettre pour toute la semaine.'),
    }),
    execute: async (args: any) => {
      const prefs = getPreferencesForAccount(args.accountId);
      const customRecipes = getAllCustomRecipes();
      const plan = generateWeeklyPlan(prefs, customRecipes);
      const scheduled = getScheduledMeals(args.accountId);

      // Appliquer les repas programmés
      const allRecipes = getAllAvailableRecipes();
      const recipeMap = new Map(allRecipes.map((r) => [r.id, r]));

      for (const sm of scheduled) {
        const r = recipeMap.get(sm.recipeId);
        if (r && plan.days[sm.dayIndex]) {
          (plan.days[sm.dayIndex] as any)[sm.mealSlot] = r;
        }
      }

      if (args.day !== undefined) {
        const dayIdx = parseDayIndex(args.day);
        const d = plan.days[dayIdx];
        return {
          accountId: args.accountId,
          day: d.dayName,
          breakfast: { title: d.breakfast.title, calories: d.breakfast.caloriesPerServing, protein: `${d.breakfast.proteinPerServing}g` },
          lunch: { title: d.lunch.title, calories: d.lunch.caloriesPerServing, protein: `${d.lunch.proteinPerServing}g` },
          dinner: { title: d.dinner.title, calories: d.dinner.caloriesPerServing, protein: `${d.dinner.proteinPerServing}g` },
          snack: { title: d.snack.title, calories: d.snack.caloriesPerServing, protein: `${d.snack.proteinPerServing}g` },
          totals: {
            calories: Math.round(d.breakfast.caloriesPerServing + d.lunch.caloriesPerServing + d.dinner.caloriesPerServing + d.snack.caloriesPerServing),
            protein: `${Math.round((d.breakfast.proteinPerServing + d.lunch.proteinPerServing + d.dinner.proteinPerServing + d.snack.proteinPerServing) * 10) / 10}g`,
          },
        };
      }

      return {
        accountId: args.accountId,
        weeklyPlan: plan.days.map((d) => ({
          day: d.dayName,
          breakfast: d.breakfast.title,
          lunch: d.lunch.title,
          dinner: d.dinner.title,
          snack: d.snack.title,
          calories: Math.round(d.breakfast.caloriesPerServing + d.lunch.caloriesPerServing + d.dinner.caloriesPerServing + d.snack.caloriesPerServing),
          protein: `${Math.round((d.breakfast.proteinPerServing + d.lunch.proteinPerServing + d.dinner.proteinPerServing + d.snack.proteinPerServing) * 10) / 10}g`,
        })),
      };
    },
  },

  // 6. Consulter le statut macro / calories
  get_macro_status: {
    name: 'get_macro_status',
    description: 'Obtenir les cibles métaboliques et le bilan calories / protéines / glucides / lipides d\'un compte.',
    requiresConfirmation: false,
    schema: z.object({
      accountId: z.enum(['ethan', 'laurine']).default('ethan').describe('Compte utilisateur'),
    }),
    execute: async (args: any) => {
      const settings = getSettingsForAccount(args.accountId);
      return {
        accountId: args.accountId,
        goal: settings.goalName,
        targets: {
          calories: `${settings.targetCalories} kcal`,
          protein: `${settings.targetProtein}g`,
          carbs: `${settings.targetCarbs}g`,
          fat: `${settings.targetFat}g`,
          weeklyBudget: `${settings.targetWeeklyBudget} $`,
        },
      };
    },
  },

  // 7. Consulter la liste d'épicerie
  get_grocery_list: {
    name: 'get_grocery_list',
    description: 'Consulter la liste de courses consolidée Metro avec rayons, articles, montants et taxes.',
    requiresConfirmation: false,
    schema: z.object({
      scope: z.enum(['common', 'ethan', 'laurine']).default('common').describe('Scope de la liste'),
    }),
    execute: async (args: any) => {
      const accounts = getAllAccounts();
      const customPrices = getAllCustomPrices();
      const customProducts = getCustomProducts();
      const pantryMap = getPantryMap();
      const customGrocery = getCustomGroceryItems();

      const accountPlans = accounts.map((acc) => {
        const prefs = getPreferencesForAccount(acc.id);
        const plan = generateWeeklyPlan(prefs, getAllCustomRecipes());
        return { accountId: acc.id, accountName: acc.name, plan };
      });

      const commonItems = generateCommonGroceryList(accountPlans, customPrices, customProducts, pantryMap);
      const allItems = [...customGrocery, ...commonItems];
      const receipt = calculateReceiptTaxes(allItems);

      return {
        scope: args.scope,
        itemCount: allItems.length,
        totalWithTax: `${receipt.totalWithTax.toFixed(2)} $ CAD`,
        savingsAmount: `${receipt.totalSavingsMoi.toFixed(2)} $`,
        items: allItems.map((i) => ({
          name: i.name,
          aisle: i.aisle,
          package: i.packageDescription,
          price: `${i.exactPriceMetro.toFixed(2)} $`,
          isInPantry: Boolean(i.isInPantry),
        })),
      };
    },
  },

  // 8. Ajouter un article libre à la liste d'épicerie
  add_to_grocery_list: {
    name: 'add_to_grocery_list',
    description: 'Ajouter un article directement à la liste d\'épicerie sans devoir passer par une recette.',
    requiresConfirmation: false,
    schema: z.object({
      name: z.string().describe('Nom de l\'article (ex: "Papier essuie-tout", "Café torréfié")'),
      aisle: z.enum([
        'FRUITS_ET_LEGUMES',
        'BOUCHERIE_ET_POISSONNERIE',
        'PRODUITS_LAITIERS_ET_OEUFS',
        'BOULANGERIE',
        'EPICERIE',
        'SURGELES',
        'DIVERS',
      ]).default('DIVERS').describe('Rayon'),
      packageDescription: z.string().default('1 unité').describe('Format ou emballage'),
      price: z.number().default(0).describe('Prix estimé ($)'),
      forAccount: z.enum(['common', 'ethan', 'laurine']).default('common').describe('Destinataire de l\'achat'),
      isTaxable: z.boolean().default(false).describe('Article taxable (TPS/TVQ 14.975%)'),
    }),
    execute: async (args: any) => {
      const item = saveCustomGroceryItem({
        name: args.name,
        aisle: args.aisle as MetroAisle,
        packageDescription: args.packageDescription,
        regularPriceMetro: args.price,
        exactPriceMetro: args.price,
        isTaxable: args.isTaxable,
        forAccount: args.forAccount,
      });

      return {
        message: `✅ « ${item.name} » ajouté à la liste d'épicerie (${args.forAccount === 'common' ? 'Commune' : `Pour ${args.forAccount}`}) !`,
        item: { id: item.id, name: item.name, price: `${item.exactPriceMetro.toFixed(2)} $`, aisle: item.aisle },
      };
    },
  },

  // 9. Garde-manger : consulter
  get_pantry_items: {
    name: 'get_pantry_items',
    description: 'Lister tous les aliments actuellement marqués en stock dans le garde-manger.',
    requiresConfirmation: false,
    schema: z.object({}),
    execute: async () => {
      const pantryMap = getPantryMap();
      const catalog = getMergedCatalog();
      const inStock = Object.keys(pantryMap).map((id) => catalog[id]?.name || id);

      return {
        totalInStock: inStock.length,
        items: inStock,
      };
    },
  },

  // 10. Garde-manger : modifier le stock
  toggle_pantry_item: {
    name: 'toggle_pantry_item',
    description: 'Marquer un aliment comme en stock ou manquant dans le garde-manger.',
    requiresConfirmation: false,
    schema: z.object({
      ingredientId: z.string().describe('ID de l\'aliment ou nom'),
      inStock: z.boolean().describe('true si disponible en stock, false si épuisé'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      let id = args.ingredientId;
      if (!catalog[id]) {
        const match = Object.values(catalog).find((c) => c.name.toLowerCase() === id.toLowerCase());
        if (match) id = match.id;
      }
      const item = catalog[id];
      const name = item ? item.name : id;

      setPantryItem(id, args.inStock);
      return {
        message: args.inStock
          ? `✅ « ${name} » marqué comme en stock dans le garde-manger.`
          : `✅ « ${name} » marqué comme épuisé / retiré du garde-manger.`,
        ingredientId: id,
        inStock: args.inStock,
      };
    },
  },

  // 11. Rechercher des recettes
  search_recipes: {
    name: 'search_recipes',
    description: 'Rechercher des recettes dans le catalogue par nom, tag ou type de repas.',
    requiresConfirmation: false,
    schema: z.object({
      query: z.string().optional().describe('Terme de recherche'),
      mealType: z.enum(['dejeuner', 'diner', 'souper', 'collation']).optional().describe('Type de repas'),
    }),
    execute: async (args: any) => {
      const all = getAllAvailableRecipes();
      const q = (args.query || '').trim().toLowerCase();
      const results = all.filter((r) => {
        if (args.mealType && r.mealType !== args.mealType) return false;
        if (!q) return true;
        return r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q));
      });

      return {
        count: results.length,
        recipes: results.map((r) => ({
          id: r.id,
          title: r.title,
          mealType: r.mealType,
          isCustom: Boolean(r.isCustom),
          calories: r.caloriesPerServing,
          protein: `${r.proteinPerServing}g`,
        })),
      };
    },
  },

  // 12. Rechercher des aliments dans le catalogue
  search_catalog: {
    name: 'search_catalog',
    description: 'Rechercher des aliments dans le catalogue complet (Metro & produits personnalisés).',
    requiresConfirmation: false,
    schema: z.object({
      query: z.string().describe('Nom de l\'aliment à rechercher (ex: "poulet", "gruau", "lait")'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      const q = args.query.trim().toLowerCase();
      const matches = Object.values(catalog).filter((c) => c.name.toLowerCase().includes(q) || c.packaging.label.toLowerCase().includes(q));

      return {
        count: matches.length,
        items: matches.slice(0, 15).map((m) => ({
          id: m.id,
          name: m.name,
          aisle: m.aisle,
          price: `${m.packaging.exactPriceMetro.toFixed(2)} $`,
          package: m.packaging.label,
          proteinPer100g: m.macrosPer100g?.protein ?? 0,
        })),
      };
    },
  },
};

// ==========================================
// OUTILS AVEC VALIDATION HUMAINE REQUISE (Suppression & Modification critique)
// ==========================================

export const toolSchemasWithConfirmation = {
  // 1. Supprimer une recette (AVEC VALIDATION)
  delete_recipe: {
    name: 'delete_recipe',
    description: 'Supprimer définitivement une recette de la base de données. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      recipeId: z.string().describe('ID de la recette à supprimer'),
      confirmed: z.boolean().default(false).describe('Doit valoir true UNIQUEMENT après accord explicite de l\'utilisateur'),
    }),
    execute: async (args: any) => {
      const existing = getCustomRecipeById(args.recipeId);
      if (!existing) {
        throw new Error(`Recette personnalisée introuvable avec l'ID « ${args.recipeId} » (les recettes natives Metro ne peuvent pas être supprimées).`);
      }

      if (!args.confirmed) {
        return {
          requires_confirmation: true,
          action: 'delete_recipe',
          warning: `⚠️ CONFIRMATION REQUISE : Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT la recette « ${existing.title} » (ID: ${existing.id}).`,
          instruction: 'Veuillez demander à l\'utilisateur : « Confirmez-vous la suppression définitive de cette recette ? ». Si oui, réexécutez cet outil avec confirmed=true.',
        };
      }

      deleteCustomRecipe(args.recipeId);
      return {
        message: `🗑️ Recette « ${existing.title} » supprimée définitivement de la base de données.`,
        deletedRecipeId: args.recipeId,
      };
    },
  },

  // 2. Modifier une recette existante (AVEC VALIDATION)
  modify_recipe: {
    name: 'modify_recipe',
    description: 'Modifier le titre, ingrédients ou étapes d\'une recette existante. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      recipeId: z.string().describe('ID de la recette'),
      title: z.string().optional().describe('Nouveau titre'),
      prepTimeMinutes: z.number().optional(),
      cookTimeMinutes: z.number().optional(),
      servings: z.number().optional(),
      instructions: z.array(z.string()).optional(),
      confirmed: z.boolean().default(false).describe('Doit valoir true UNIQUEMENT après confirmation de l\'utilisateur'),
    }),
    execute: async (args: any) => {
      const existing = getCustomRecipeById(args.recipeId);
      if (!existing) {
        throw new Error(`Recette personnalisée introuvable avec l'ID « ${args.recipeId} »`);
      }

      if (!args.confirmed) {
        return {
          requires_confirmation: true,
          action: 'modify_recipe',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez modifier la recette existante « ${existing.title} ».`,
          proposedChanges: {
            title: args.title ?? existing.title,
            servings: args.servings ?? existing.servings,
            prepTime: args.prepTimeMinutes ?? existing.prepTimeMinutes,
          },
          instruction: 'Demandez à l\'utilisateur : « Confirmez-vous l\'application de ces modifications à la recette ? ». Si oui, réexécutez avec confirmed=true.',
        };
      }

      const updated = saveCustomRecipe({
        ...existing,
        title: args.title ?? existing.title,
        prepTimeMinutes: args.prepTimeMinutes ?? existing.prepTimeMinutes,
        cookTimeMinutes: args.cookTimeMinutes ?? existing.cookTimeMinutes,
        servings: args.servings ?? existing.servings,
        instructions: args.instructions ?? existing.instructions,
      });

      return {
        message: `✏️ Recette « ${updated.title} » modifiée avec succès.`,
        recipe: updated,
      };
    },
  },

  // 3. Retirer un plat programmé (AVEC VALIDATION)
  remove_scheduled_meal: {
    name: 'remove_scheduled_meal',
    description: 'Déprogrammer ou retirer un plat du planning d\'un jour donné. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      accountId: z.enum(['ethan', 'laurine']).default('ethan'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour'),
      mealSlot: z.string().describe('Créneau du repas (breakfast/dejeuner, lunch/diner, dinner/souper, snack/collation)'),
      confirmed: z.boolean().default(false).describe('Doit valoir true UNIQUEMENT après accord de l\'utilisateur'),
    }),
    execute: async (args: any) => {
      const dayIndex = parseDayIndex(args.day);
      const slot = parseMealSlot(args.mealSlot);
      const dayName = DAY_NAMES[dayIndex];

      if (!args.confirmed) {
        return {
          requires_confirmation: true,
          action: 'remove_scheduled_meal',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez retirer le plat programmé le ${dayName} (${slot}) pour ${args.accountId}.`,
          instruction: 'Demandez confirmation à l\'utilisateur avant d\'effacer ce créneau. Si accord, rappelez avec confirmed=true.',
        };
      }

      deleteScheduledMeal(args.accountId, dayIndex, slot);
      return {
        message: `🗑️ Plat déprogrammé pour ${args.accountId} le ${dayName} (${slot}).`,
      };
    },
  },

  // 4. Vider le planning complet d'un jour (AVEC VALIDATION)
  clear_day_schedule: {
    name: 'clear_day_schedule',
    description: 'Effacer tous les repas programmés pour un jour donné. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      accountId: z.enum(['ethan', 'laurine']).default('ethan'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour'),
      confirmed: z.boolean().default(false).describe('Doit valoir true après validation'),
    }),
    execute: async (args: any) => {
      const dayIndex = parseDayIndex(args.day);
      const dayName = DAY_NAMES[dayIndex];

      if (!args.confirmed) {
        return {
          requires_confirmation: true,
          action: 'clear_day_schedule',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez vider TOUS les repas prévus le ${dayName} pour ${args.accountId}.`,
          instruction: 'Demandez à l\'utilisateur : « Confirmez-vous la réinitialisation complète des repas du ${dayName} ? ». Si oui, confirmez avec confirmed=true.',
        };
      }

      clearDaySchedule(args.accountId, dayIndex);
      return {
        message: `🗑️ Tous les repas du ${dayName} ont été vidés pour ${args.accountId}.`,
      };
    },
  },

  // 5. Supprimer un aliment personnalisé (AVEC VALIDATION)
  delete_custom_product: {
    name: 'delete_custom_product',
    description: 'Supprimer définitivement un aliment personnalisé du catalogue. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      productId: z.string().describe('ID de l\'aliment personnalisé à supprimer'),
      confirmed: z.boolean().default(false).describe('Doit valoir true après validation'),
    }),
    execute: async (args: any) => {
      const customProducts = getCustomProducts();
      const target = customProducts.find((p) => p.id === args.productId);
      if (!target) {
        throw new Error(`Aliment personnalisé introuvable avec l'ID « ${args.productId} » (les aliments de base Metro ne peuvent pas être supprimés).`);
      }

      if (!args.confirmed) {
        return {
          requires_confirmation: true,
          action: 'delete_custom_product',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez supprimer définitivement l'aliment « ${target.name} » du catalogue.`,
          instruction: 'Demandez confirmation à l\'utilisateur avant de supprimer cet aliment. Si accord, rappelez avec confirmed=true.',
        };
      }

      deleteCustomProduct(args.productId);
      return {
        message: `🗑️ Aliment « ${target.name} » supprimé définitivement du catalogue.`,
      };
    },
  },
};

export const ALL_TOOLS = {
  ...toolSchemas,
  ...toolSchemasWithConfirmation,
};
