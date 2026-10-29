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
  getAllAccounts,
  getSettingsForAccount,
} from '@/lib/db';
import { RECIPES } from '@/data/recipes';
import { INGREDIENTS } from '@/data/ingredients';
import { generateWeeklyPlan } from '@/lib/planner';
import { calculateRecipeNutrients } from '@/lib/nutrition';
import { generateCommonGroceryList, calculateReceiptTaxes } from '@/lib/grocery';
import { Ingredient, Recipe, MetroAisle } from '@/types';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

const DAY_MAP: Record<string, number> = {
  // French full
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
  // French abbr
  lun: 0, mar: 1, mer: 2, jeu: 3, ven: 4, sam: 5, dim: 6,
  // English full
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6,
  // English abbr
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
  // Numeric strings
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
};

export function parseDayIndex(input: number | string): number {
  if (typeof input === 'number') {
    if (input >= 0 && input <= 6) {
      return Math.floor(input);
    }
    throw new Error(`Index de jour invalide : ${input}. Les valeurs acceptées vont de 0 (Lundi) à 6 (Dimanche).`);
  }
  const clean = normalizeText(String(input));
  if (clean in DAY_MAP) {
    return DAY_MAP[clean];
  }
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num >= 0 && num <= 6) {
    return num;
  }
  throw new Error(`Jour non reconnu : « ${input} ». Jours acceptés : Lundi à Dimanche, Monday to Sunday, ou index 0 à 6.`);
}

export function parseRecipeMealType(type?: string): 'dejeuner' | 'diner' | 'souper' | 'collation' {
  if (!type) return 'diner';
  const t = normalizeText(type).replace(/[\s-]+/g, '');
  if (['breakfast', 'dejeuner', 'petitdejeuner', 'matin'].includes(t)) return 'dejeuner';
  if (['lunch', 'diner', 'midi'].includes(t)) return 'diner';
  if (['dinner', 'souper', 'soir'].includes(t)) return 'souper';
  if (['snack', 'collation', 'gouter'].includes(t)) return 'collation';
  return 'diner';
}

export function parseMealSlot(slot?: string): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  if (!slot) return 'lunch';
  const s = normalizeText(slot).replace(/[\s-]+/g, '');
  if (['petitdejeuner', 'petitdej', 'matin', 'morning', 'breakfast', 'dejeuner'].includes(s)) {
    return 'breakfast';
  }
  if (['midi', 'lunch', 'diner'].includes(s)) {
    return 'lunch';
  }
  if (['souper', 'dinner', 'soir', 'soiree', 'evening'].includes(s)) {
    return 'dinner';
  }
  if (['collation', 'snack', 'gouter', '4h', 'quatreheures'].includes(s)) {
    return 'snack';
  }
  return 'lunch';
}

export function parseAisle(aisle?: string): MetroAisle {
  if (!aisle) return 'DIVERS';
  const clean = normalizeText(aisle).replace(/[\s_-]+/g, '');
  if (clean.includes('fruit') || clean.includes('legume') || clean.includes('produce') || clean.includes('vegetable')) {
    return 'FRUITS_ET_LEGUMES';
  }
  if (clean.includes('boucher') || clean.includes('viande') || clean.includes('poisson') || clean.includes('meat') || clean.includes('fish') || clean.includes('poulet')) {
    return 'BOUCHERIE_ET_POISSONNERIE';
  }
  if (clean.includes('lait') || clean.includes('oeuf') || clean.includes('dairy') || clean.includes('fromage') || clean.includes('egg') || clean.includes('yogourt') || clean.includes('creme')) {
    return 'PRODUITS_LAITIERS_ET_OEUFS';
  }
  if (clean.includes('boulang') || clean.includes('pain') || clean.includes('bakery') || clean.includes('bread') || clean.includes('patiss')) {
    return 'BOULANGERIE';
  }
  if (clean.includes('surgele') || clean.includes('congel') || clean.includes('frozen')) {
    return 'SURGELES';
  }
  if (clean.includes('epicerie') || clean.includes('grocery') || clean.includes('pantry') || clean.includes('garde')) {
    return 'EPICERIE';
  }
  if (clean === 'divers' || clean === 'other' || clean === 'misc') {
    return 'DIVERS';
  }
  const upper = aisle.toUpperCase().trim();
  const validAisles: MetroAisle[] = [
    'FRUITS_ET_LEGUMES',
    'BOUCHERIE_ET_POISSONNERIE',
    'PRODUITS_LAITIERS_ET_OEUFS',
    'BOULANGERIE',
    'EPICERIE',
    'SURGELES',
    'DIVERS'
  ];
  if (validAisles.includes(upper as MetroAisle)) {
    return upper as MetroAisle;
  }
  return 'EPICERIE';
}

export function parseUnit(unit?: string): 'g' | 'ml' | 'unite' {
  if (!unit) return 'g';
  const clean = normalizeText(unit).replace(/[\s_.-]+/g, '');
  if (['g', 'gramme', 'grammes', 'gram', 'grams'].includes(clean)) return 'g';
  if (['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters', 'l', 'litre', 'litres'].includes(clean)) return 'ml';
  if (['unite', 'unites', 'unit', 'units', 'piece', 'pieces', 'u', 'nb', 'boite', 'pot', 'conserve', 'canne', 'bouteille'].includes(clean)) return 'unite';
  return 'g';
}

export function parseAccountId(accountId?: string): 'ethan' | 'laurine' {
  if (!accountId) return 'ethan';
  const clean = accountId.toLowerCase().trim();
  if (clean === 'laurine' || clean === 'copine' || clean === 'l') return 'laurine';
  return 'ethan';
}

if (INGREDIENTS.oeufs_gros && !INGREDIENTS.oeufs_larges) {
  (INGREDIENTS as any).oeufs_larges = { ...INGREDIENTS.oeufs_gros, id: 'oeufs_larges' };
}

const STOP_WORDS = new Set([
  'de', 'du', 'la', 'le', 'les', 'des', 'aux', 'et', 'en', 'au', 'a', 'd', 'l', 'un', 'une', 'pour', 'avec', 'sans', 'frais'
]);

const CANONICAL_DEFAULTS: Record<string, string> = {
  'poitrine de poulet': 'poulet_poitrine',
  'poitrine poulet': 'poulet_poitrine',
  'blanc de poulet': 'poulet_poitrine',
  'blanc poulet': 'poulet_poitrine',
  'poulet': 'poulet_poitrine',
  'champignons': 'champignons_blancs',
  'champignon': 'champignons_blancs',
  'pates': 'pates_penne',
  'pate': 'pates_penne',
  'penne': 'pates_penne',
  'pennes': 'pates_penne',
  'creme 35': 'creme_35',
  'creme 35%': 'creme_35',
  'creme': 'creme_35',
  'creme 15': 'creme_15',
  'creme 15%': 'creme_15',
  'boeuf hache': 'boeuf_hache_maigre',
  'boeuf hache maigre': 'boeuf_hache_maigre',
  'viande hachee': 'boeuf_hache_maigre',
  'oeufs': 'oeufs_larges',
  'oeuf': 'oeufs_larges',
  'oeufs larges': 'oeufs_larges',
  'oeufs gros': 'oeufs_gros',
  'riz': 'riz_basmati',
  'riz blanc': 'riz_basmati',
  'lait': 'lait_2_pourcent',
  'lait 2%': 'lait_2_pourcent',
  'lait 2': 'lait_2_pourcent',
  // English mappings & common variants
  'chicken breast': 'poulet_poitrine',
  'chicken breasts': 'poulet_poitrine',
  'chicken': 'poulet_poitrine',
  'ground beef': 'boeuf_hache_maigre',
  'lean ground beef': 'boeuf_hache_maigre',
  'beef': 'boeuf_hache_maigre',
  'minced meat': 'boeuf_hache_maigre',
  'egg': 'oeufs_larges',
  'eggs': 'oeufs_larges',
  'large eggs': 'oeufs_larges',
  'pasta': 'pates_penne',
  'rice': 'riz_basmati',
  'white rice': 'riz_basmati',
  'milk': 'lait_2_pourcent',
  'mushrooms': 'champignons_blancs',
  'mushroom': 'champignons_blancs',
  'salmon': 'saumon_atlantique',
  'atlantic salmon': 'saumon_atlantique',
  'apple': 'pommes_gala',
  'apples': 'pommes_gala',
  'banana': 'bananes',
  'bananas': 'bananes',
  'avocado': 'avocat_has',
  'avocados': 'avocat_has',
  'onion': 'oignons_jaunes',
  'onions': 'oignons_jaunes',
  'yellow onion': 'oignons_jaunes',
  'garlic': 'ail_frais',
  'olive oil': 'huile_olive_extra_vierge',
  'oil': 'huile_olive_extra_vierge',
  'butter': 'beurre_sale',
  'cheddar': 'fromage_cheddar_fort',
  'cheese': 'fromage_cheddar_fort',
  'greek yogurt': 'yogourt_grec_nature_0',
  'yogurt': 'yogourt_grec_nature_0',
  'oats': 'flocons_avoine',
  'oatmeal': 'flocons_avoine',
  'tuna': 'thon_pale_eau',
  'canned tuna': 'thon_pale_eau',
  'bread': 'pain_tranche_integral',
};

export function extractKeywords(text: string): string[] {
  const norm = normalizeText(text);
  return norm
    .split(/[\s_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function stemWord(word: string): string {
  if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
  if (word.endsWith('x') && word.length > 3) return word.slice(0, -1);
  return word;
}

function scoreIngredient(inputKeywords: string[], normInput: string, item: Ingredient): number {
  if (inputKeywords.length === 0) return 0;
  const itemIdNorm = normalizeText(item.id);
  const itemNameNorm = normalizeText(item.name);

  if (item.id.toLowerCase() === normInput || itemIdNorm === normInput) return 1000;
  if (itemNameNorm === normInput) return 900;

  let score = 0;
  if (CANONICAL_DEFAULTS[normInput] === item.id) score += 300;

  const idTokens = extractKeywords(item.id);
  const nameTokens = extractKeywords(item.name);
  let matchedKeywordsCount = 0;

  for (const kw of inputKeywords) {
    const kwStem = stemWord(kw);
    let matched = false;

    if (idTokens.includes(kw)) {
      score += 50;
      matched = true;
    } else if (idTokens.some((t) => stemWord(t) === kwStem)) {
      score += 40;
      matched = true;
    } else if (idTokens.some((t) => t.includes(kw) || kw.includes(t))) {
      score += 25;
      matched = true;
    }

    if (nameTokens.includes(kw)) {
      score += 40;
      matched = true;
    } else if (nameTokens.some((t) => stemWord(t) === kwStem)) {
      score += 35;
      matched = true;
    } else if (nameTokens.some((t) => t.includes(kw) || kw.includes(t))) {
      score += 20;
      matched = true;
    }

    if (matched) matchedKeywordsCount++;
  }

  if (matchedKeywordsCount === 0) return 0;

  if (matchedKeywordsCount === inputKeywords.length) {
    score += 150;
  } else {
    score *= (matchedKeywordsCount / inputKeywords.length);
  }

  if (inputKeywords.length > 0 && item.id.startsWith(inputKeywords[0])) {
    score += 20;
  }

  return score;
}

export function findBestIngredient(input: string, catalog: Record<string, Ingredient>): string | null {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  if (catalog[raw]) return raw;
  const lower = raw.toLowerCase();
  if (catalog[lower]) return lower;

  const normInput = normalizeText(raw);
  if (!normInput) return null;

  if (catalog[normInput]) return normInput;

  for (const [id, item] of Object.entries(catalog)) {
    if (item.name.toLowerCase() === lower || item.id.toLowerCase() === lower) {
      return id;
    }
  }

  const canonicalId = CANONICAL_DEFAULTS[normInput];
  if (canonicalId && catalog[canonicalId]) {
    return canonicalId;
  }

  const inputKeywords = extractKeywords(normInput);
  if (inputKeywords.length === 0) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const [id, item] of Object.entries(catalog)) {
    const s = scoreIngredient(inputKeywords, normInput, item);
    if (s > bestScore) {
      bestScore = s;
      bestId = id;
    }
  }

  if (bestScore >= 30) return bestId;
  return null;
}

function getMergedCatalog(): Record<string, Ingredient> {
  const customProducts = getCustomProducts();
  const customMap = Object.fromEntries(customProducts.map((p) => [p.id, p]));
  const base = { ...INGREDIENTS, ...customMap };
  if (base.oeufs_gros && !base.oeufs_larges) {
    base.oeufs_larges = { ...base.oeufs_gros, id: 'oeufs_larges' };
  }
  return base;
}

function getAllAvailableRecipes(): Recipe[] {
  const customRecipes = getAllCustomRecipes();
  return [...RECIPES, ...customRecipes];
}

export function findCustomRecipe(identifier: string): Recipe | null {
  if (!identifier || !identifier.trim()) return null;
  const byId = getCustomRecipeById(identifier);
  if (byId) return byId;
  const allCustom = getAllCustomRecipes();
  const norm = normalizeText(identifier);
  if (!norm || !norm.trim()) return null;
  let found = allCustom.find((r) => r.id.toLowerCase() === norm || normalizeText(r.title) === norm);
  if (found) return found;
  found = allCustom.find((r) => normalizeText(r.title).includes(norm));
  if (found) return found;
  return null;
}

export function findCustomProduct(identifier: string): Ingredient | null {
  if (!identifier || !identifier.trim()) return null;
  const customProducts = getCustomProducts();
  const norm = normalizeText(identifier);
  if (!norm || !norm.trim()) return null;
  let found = customProducts.find((p) => p.id === identifier || p.id.toLowerCase() === norm);
  if (found) return found;
  found = customProducts.find((p) => normalizeText(p.name) === norm);
  if (found) return found;
  found = customProducts.find((p) => normalizeText(p.name).includes(norm));
  if (found) return found;
  return null;
}

// ==========================================
// OUTILS SANS VALIDATION HUMAINE (Ajout / Modif sûre / Lecture)
// ==========================================

export const toolSchemas = {
  // 1. Créer une recette
  create_recipe: {
    name: 'create_recipe',
    description: 'Créer une nouvelle recette personnalisée avec ingrédients, étapes et calcul automatique des macros. Utiliser de préférence des noms courants clairs (ex: "poitrine de poulet", "champignons", "pâtes", "crème 35%") ou des identifiants Metro (ex: "poulet_poitrine", "riz_basmati"). Les macros peuvent aussi être fournis en filet de sécurité.',
    requiresConfirmation: false,
    schema: z.object({
      title: z.string().describe('Nom de la recette (ex: "Poulet Tikka Masala Maison")'),
      mealType: z.string().default('diner').describe('Type de repas ("dejeuner", "diner", "souper", "collation" ou breakfast, lunch, dinner, snack)'),
      prepTimeMinutes: z.number().default(15).describe('Temps de préparation en minutes'),
      cookTimeMinutes: z.number().default(20).describe('Temps de cuisson en minutes'),
      servings: z.number().default(1).describe('Nombre de portions'),
      ingredients: z.array(
        z.object({
          ingredientId: z.string().optional().describe('ID Metro (ex: "poulet_poitrine") ou nom courant (ex: "poitrine de poulet")'),
          name: z.string().optional().describe('Nom de l\'ingrédient si ingredientId non renseigné'),
          quantity: z.union([z.number(), z.string()]).describe('Quantité numérique (ex: 200)'),
          unit: z.string().optional().describe('Unité (g, ml, unite, canne, c_a_soupe, tranche)'),
          calories: z.number().optional().describe('Calories de l\'ingrédient (optionnel, filet de sécurité)'),
          protein: z.number().optional().describe('Protéines en g (optionnel)'),
          carbs: z.number().optional().describe('Glucides en g (optionnel)'),
          fat: z.number().optional().describe('Lipides en g (optionnel)'),
        })
      ).describe('Liste des ingrédients'),
      instructions: z.array(z.string()).default([]).describe('Étapes de préparation'),
      tags: z.array(z.string()).default(['fait-maison']).describe('Tags ou étiquettes'),
      createdBy: z.string().default('ethan').describe('Identifiant du créateur ("ethan" ou "laurine")'),
      caloriesPerServing: z.number().optional().describe('Calories par portion (optionnel, filet de sécurité)'),
      proteinPerServing: z.number().optional().describe('Protéines par portion en g (optionnel)'),
      carbsPerServing: z.number().optional().describe('Glucides par portion en g (optionnel)'),
      fatPerServing: z.number().optional().describe('Lipides par portion en g (optionnel)'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      const resolvedMealType = parseRecipeMealType(args.mealType);
      const servings = Math.max(1, args.servings || 1);

      let fallbackTotalCalories = 0;
      let fallbackTotalProtein = 0;
      let fallbackTotalCarbs = 0;
      let fallbackTotalFat = 0;

      // Résoudre les ingredientId si l'IA a passé un nom au lieu d'un ID
      const resolvedIngredients = args.ingredients.map((ing: any) => {
        const raw = (ing.ingredientId || ing.name || ing.id || '').trim();
        const matchedId = findBestIngredient(raw, catalog);
        const finalId = matchedId || raw || 'custom_item';

        const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity) || 1;
        const unit = ing.unit || catalog[finalId]?.baseUnit || 'g';

        if (ing.calories) fallbackTotalCalories += Number(ing.calories) || 0;
        if (ing.protein) fallbackTotalProtein += Number(ing.protein) || 0;
        if (ing.carbs) fallbackTotalCarbs += Number(ing.carbs) || 0;
        if (ing.fat) fallbackTotalFat += Number(ing.fat) || 0;

        return {
          ingredientId: finalId,
          quantity: qty,
          unit,
        };
      });

      const nutrients = calculateRecipeNutrients(resolvedIngredients, servings, catalog);

      let finalCalories = nutrients.caloriesPerServing;
      let finalProtein = nutrients.proteinPerServing;
      let finalCarbs = nutrients.carbsPerServing;
      let finalFat = nutrients.fatPerServing;

      // Filet de sécurité si aucun ingrédient n'a permis de calculer des macros > 0
      if (finalCalories <= 0) {
        if (typeof args.caloriesPerServing === 'number' && args.caloriesPerServing > 0) {
          finalCalories = Math.round(args.caloriesPerServing);
          finalProtein = Math.round((args.proteinPerServing ?? 0) * 10) / 10;
          finalCarbs = Math.round((args.carbsPerServing ?? 0) * 10) / 10;
          finalFat = Math.round((args.fatPerServing ?? 0) * 10) / 10;
        } else if (fallbackTotalCalories > 0) {
          finalCalories = Math.round(fallbackTotalCalories / servings);
          finalProtein = Math.round((fallbackTotalProtein / servings) * 10) / 10;
          finalCarbs = Math.round((fallbackTotalCarbs / servings) * 10) / 10;
          finalFat = Math.round((fallbackTotalFat / servings) * 10) / 10;
        }
      }

      const created = saveCustomRecipe({
        title: args.title,
        mealType: resolvedMealType,
        prepTimeMinutes: args.prepTimeMinutes,
        cookTimeMinutes: args.cookTimeMinutes,
        servings: servings,
        ingredients: resolvedIngredients,
        instructions: args.instructions,
        tags: args.tags,
        createdBy: args.createdBy,
        caloriesPerServing: finalCalories,
        proteinPerServing: finalProtein,
        carbsPerServing: finalCarbs,
        fatPerServing: finalFat,
      }, catalog);

      const costText = nutrients.estimatedTotalCost ? ` | Coût estimé : ${nutrients.estimatedTotalCost.toFixed(2)} $` : '';
      const message = `🍳 **Recette « ${created.title} » créée avec succès !**\n` +
        `• Portion(s) : **${created.servings}** | Repas : **${created.mealType}**\n` +
        `• Macros par portion : **${created.caloriesPerServing} kcal** | **${created.proteinPerServing}g P** | **${created.carbsPerServing}g G** | **${created.fatPerServing}g L**${costText}\n` +
        `• Ingrédients (${created.ingredients.length}) : ` +
        created.ingredients.map((i) => catalog[i.ingredientId]?.name || i.ingredientId).slice(0, 5).join(', ') +
        (created.ingredients.length > 5 ? ` et ${created.ingredients.length - 5} autre(s)...` : '');

      return {
        message,
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
          estimatedCostTotal: nutrients.estimatedTotalCost ? `${nutrients.estimatedTotalCost.toFixed(2)} $` : undefined,
          estimatedCostPerServing: nutrients.estimatedCostPerServing ? `${nutrients.estimatedCostPerServing.toFixed(2)} $` : undefined,
          ingredientsCount: created.ingredients.length,
          matchedIngredients: created.ingredients.map((ing) => ({
            id: ing.ingredientId,
            matchedMetro: catalog[ing.ingredientId] ? catalog[ing.ingredientId].name : null,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
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
      accountId: z.string().default('ethan').describe('Compte cible (ethan ou laurine)'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour (0-6 ou "Lundi", "Mardi", "Monday", etc.)'),
      mealSlot: z.string().describe('Créneau du repas (breakfast/dejeuner, lunch/diner, dinner/souper, snack/collation)'),
      recipeId: z.string().describe('ID de la recette ou titre approchant'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const dayIndex = parseDayIndex(args.day);
      const slot = parseMealSlot(args.mealSlot);
      const allRecipes = getAllAvailableRecipes();
      const normInput = normalizeText(args.recipeId);
      let recipe = null;
      if (normInput && normInput.trim()) {
        recipe = allRecipes.find((r) => r.id === args.recipeId || r.id.toLowerCase() === normInput);
        if (!recipe) {
          recipe = allRecipes.find((r) => normalizeText(r.title) === normInput);
        }
        if (!recipe) {
          recipe = allRecipes.find((r) => normalizeText(r.title).includes(normInput));
        }
      }
      if (!recipe) {
        const suggestions = allRecipes.slice(0, 3).map((r) => `• ${r.title} (ID: ${r.id})`).join('\n');
        throw new Error(`Aucune recette trouvée avec l'identifiant ou le titre « ${args.recipeId} ».\n💡 Recettes disponibles :\n${suggestions || 'Aucune recette disponible.'}`);
      }

      setScheduledMeal(accId, dayIndex, slot, recipe.id);
      return {
        message: `📅 **Plat « ${recipe.title} » programmé !**\n• Compte : **${accId}**\n• Créneau : **${DAY_NAMES[dayIndex]}** (${slot})\n• Macros : ${recipe.caloriesPerServing} kcal | ${recipe.proteinPerServing}g P`,
        schedule: {
          accountId: accId,
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
      if (args.customPrice !== null && (typeof args.customPrice !== 'number' || args.customPrice < 0)) {
        throw new Error(`Le prix personnalisé doit être supérieur ou égal à 0 (reçu : ${args.customPrice}).`);
      }
      const catalog = getMergedCatalog();
      let id = args.ingredientId;
      if (!catalog[id]) {
        const matched = findBestIngredient(id, catalog);
        if (matched) id = matched;
      }
      const item = catalog[id];
      if (!item) {
        const suggestions = Object.values(catalog).slice(0, 3).map((i) => `• ${i.name} (ID: ${i.id})`).join('\n');
        throw new Error(`Aliment introuvable avec l'identifiant « ${args.ingredientId} ».\n💡 Suggestions d'aliments du catalogue :\n${suggestions}`);
      }

      setCustomPrice(id, args.customPrice);
      return {
        message: args.customPrice !== null
          ? `✅ **Prix personnalisé mis à jour** : « ${item.name} » fixé à **${args.customPrice.toFixed(2)} $ CAD**.`
          : `✅ **Prix réinitialisé** : « ${item.name} » rétabli au tarif officiel Metro (**${item.packaging.exactPriceMetro.toFixed(2)} $**).`,
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
      aisle: z.string().default('EPICERIE').describe('Rayon d\'épicerie (ex: "fruits", "boulangerie", "épicerie")'),
      price: z.number().describe('Prix en magasin ($ CAD)'),
      amount: z.number().default(100).describe('Quantité dans l\'emballage (ex: 450)'),
      unit: z.string().default('g').describe('Unité de mesure (g, ml, unite)'),
      packageLabel: z.string().optional().describe('Description de l\'emballage (ex: "Bloc de 454g")'),
      caloriesPer100g: z.number().describe('Calories pour 100g/100ml'),
      proteinPer100g: z.number().describe('Protéines pour 100g/100ml'),
      carbsPer100g: z.number().default(0).describe('Glucides pour 100g/100ml'),
      fatPer100g: z.number().default(0).describe('Lipides pour 100g/100ml'),
      barcode: z.string().optional().describe('Code-barres EAN/UPC'),
      isTaxable: z.boolean().default(false).describe('Taxable à 14.975% (TPS/TVQ) ou détaxé (aliments de base)'),
    }),
    execute: async (args: any) => {
      const resolvedAisle = parseAisle(args.aisle);
      const resolvedUnit = parseUnit(args.unit);
      const amount = typeof args.amount === 'number' && args.amount > 0 ? args.amount : 100;
      const saved = saveCustomProduct({
        name: args.name,
        aisle: resolvedAisle,
        packaging: {
          amount: amount,
          unit: resolvedUnit,
          label: args.packageLabel || `${amount}${resolvedUnit}`,
          regularPriceMetro: args.price,
          exactPriceMetro: args.price,
          unitPricePer100g: amount > 0 ? (args.price / (amount / 100)) : 0,
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

      const message = `✨ **Aliment personnalisé « ${saved.name} » ajouté !**\n` +
        `• Rayon : **${saved.aisle}** | Format : **${saved.packaging.amount} ${saved.packaging.unit}** (${saved.packaging.exactPriceMetro.toFixed(2)} $)\n` +
        `• Macros (100g) : **${saved.macrosPer100g.calories} kcal** | **${saved.macrosPer100g.protein}g P** | **${saved.macrosPer100g.carbs}g G** | **${saved.macrosPer100g.fat}g L**`;

      return {
        message,
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
      accountId: z.string().default('ethan').describe('Compte utilisateur (ethan ou laurine)'),
      day: z.union([z.number().min(0).max(6), z.string()]).optional().describe('Jour (ex: "Lundi", "Monday" ou 0-6). Omettre pour toute la semaine.'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const prefs = getPreferencesForAccount(accId);
      const customRecipes = getAllCustomRecipes();
      const plan = generateWeeklyPlan(prefs, customRecipes);
      const scheduled = getScheduledMeals(accId);

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
        const totals = {
          calories: Math.round(d.breakfast.caloriesPerServing + d.lunch.caloriesPerServing + d.dinner.caloriesPerServing + d.snack.caloriesPerServing),
          protein: `${Math.round((d.breakfast.proteinPerServing + d.lunch.proteinPerServing + d.dinner.proteinPerServing + d.snack.proteinPerServing) * 10) / 10}g`,
        };
        const message = `📅 **Menu du ${d.dayName} (${accId})**\n` +
          `• 🥐 **Déjeuner** : ${d.breakfast.title} (${d.breakfast.caloriesPerServing} kcal, ${d.breakfast.proteinPerServing}g P)\n` +
          `• 🥗 **Dîner** : ${d.lunch.title} (${d.lunch.caloriesPerServing} kcal, ${d.lunch.proteinPerServing}g P)\n` +
          `• 🍲 **Souper** : ${d.dinner.title} (${d.dinner.caloriesPerServing} kcal, ${d.dinner.proteinPerServing}g P)\n` +
          `• 🍎 **Collation** : ${d.snack.title} (${d.snack.caloriesPerServing} kcal, ${d.snack.proteinPerServing}g P)\n` +
          `📊 **Total** : ${totals.calories} kcal | ${totals.protein} P`;

        return {
          message,
          accountId: accId,
          day: d.dayName,
          breakfast: { title: d.breakfast.title, calories: d.breakfast.caloriesPerServing, protein: `${d.breakfast.proteinPerServing}g` },
          lunch: { title: d.lunch.title, calories: d.lunch.caloriesPerServing, protein: `${d.lunch.proteinPerServing}g` },
          dinner: { title: d.dinner.title, calories: d.dinner.caloriesPerServing, protein: `${d.dinner.proteinPerServing}g` },
          snack: { title: d.snack.title, calories: d.snack.caloriesPerServing, protein: `${d.snack.proteinPerServing}g` },
          totals,
        };
      }

      const weeklyPlan = plan.days.map((d) => ({
        day: d.dayName,
        breakfast: d.breakfast.title,
        lunch: d.lunch.title,
        dinner: d.dinner.title,
        snack: d.snack.title,
        calories: Math.round(d.breakfast.caloriesPerServing + d.lunch.caloriesPerServing + d.dinner.caloriesPerServing + d.snack.caloriesPerServing),
        protein: `${Math.round((d.breakfast.proteinPerServing + d.lunch.proteinPerServing + d.dinner.proteinPerServing + d.snack.proteinPerServing) * 10) / 10}g`,
      }));

      const message = `📅 **Planning de la semaine (${accId})**\n\n` +
        weeklyPlan.map((d) => `**${d.day}** (${d.calories} kcal, ${d.protein} P)\n` +
          `  • 🥐 ${d.breakfast}\n` +
          `  • 🥗 ${d.lunch}\n` +
          `  • 🍲 ${d.dinner}\n` +
          `  • 🍎 ${d.snack}`).join('\n\n');

      return {
        message,
        accountId: accId,
        weeklyPlan,
      };
    },
  },

  // 6. Consulter le statut macro / calories
  get_macro_status: {
    name: 'get_macro_status',
    description: 'Obtenir les cibles métaboliques et le bilan calories / protéines / glucides / lipides d\'un compte.',
    requiresConfirmation: false,
    schema: z.object({
      accountId: z.string().default('ethan').describe('Compte utilisateur (ethan ou laurine)'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const settings = getSettingsForAccount(accId);
      const message = `🎯 **Objectifs métaboliques de ${accId}**\n` +
        `• Objectif : **${settings.goalName}**\n` +
        `• Calories cibles : **${settings.targetCalories} kcal** / jour\n` +
        `• Protéines : **${settings.targetProtein}g** | Glucides : **${settings.targetCarbs}g** | Lipides : **${settings.targetFat}g**\n` +
        `• Budget épicerie : **${settings.targetWeeklyBudget} $** / semaine`;

      return {
        message,
        accountId: accId,
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
      scope: z.string().default('common').describe('Scope de la liste ("common", "ethan", "laurine")'),
    }),
    execute: async (args: any) => {
      const rawScope = (args.scope || 'common').toLowerCase().trim();
      const scope = (rawScope === 'ethan' || rawScope === 'laurine') ? rawScope : 'common';
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

      let allItems: typeof commonItems = [];
      if (scope === 'ethan' || scope === 'laurine') {
        const filteredCommon = commonItems.filter((i) => (i.neededBy || []).includes(scope));
        const filteredCustom = customGrocery.filter((i) => i.forAccount === scope || i.forAccount === 'common');
        allItems = [...filteredCustom, ...filteredCommon];
      } else {
        allItems = [...customGrocery, ...commonItems];
      }

      const receipt = calculateReceiptTaxes(allItems);
      const scopeLabel = scope === 'common' ? 'Commune' : `Pour ${scope}`;
      const message = `🛒 **Liste d'épicerie (${scopeLabel})**\n` +
        `• Articles : **${allItems.length}** | Total estimé : **${receipt.totalWithTax.toFixed(2)} $ CAD**\n` +
        `• Économies estimées : **${receipt.totalSavingsMoi.toFixed(2)} $**\n\n` +
        allItems.slice(0, 10).map((i) => `• ${i.isInPantry ? '📦 ' : '▫️ '}**${i.name}** — ${i.packageDescription} (${i.exactPriceMetro.toFixed(2)} $)`).join('\n') +
        (allItems.length > 10 ? `\n... et ${allItems.length - 10} autre(s) article(s).` : '');

      return {
        message,
        scope,
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
      aisle: z.string().default('DIVERS').describe('Rayon d\'épicerie (ex: "fruits", "boulangerie", "épicerie")'),
      packageDescription: z.string().default('1 unité').describe('Format ou emballage'),
      price: z.number().default(0).describe('Prix estimé ($)'),
      forAccount: z.string().default('common').describe('Destinataire de l\'achat ("common", "ethan", "laurine")'),
      isTaxable: z.boolean().default(false).describe('Article taxable (TPS/TVQ 14.975%)'),
    }),
    execute: async (args: any) => {
      const resolvedAisle = parseAisle(args.aisle);
      const acc = (args.forAccount || 'common').toLowerCase().trim();
      const forAccount = (acc === 'ethan' || acc === 'laurine') ? acc : 'common';
      const item = saveCustomGroceryItem({
        name: args.name,
        aisle: resolvedAisle,
        packageDescription: args.packageDescription,
        regularPriceMetro: args.price,
        exactPriceMetro: args.price,
        isTaxable: args.isTaxable,
        forAccount,
      });

      return {
        message: `✅ **« ${item.name} »** ajouté à la liste d'épicerie (${forAccount === 'common' ? 'Commune' : `Pour ${forAccount}`}) ! Prix : ${item.exactPriceMetro.toFixed(2)} $.`,
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
      const inStock = Object.keys(pantryMap).filter((id) => pantryMap[id]).map((id) => catalog[id]?.name || id);

      const message = inStock.length === 0
        ? `📦 Le garde-manger est actuellement vide.`
        : `📦 **Garde-manger : ${inStock.length} aliment${inStock.length > 1 ? 's en stock' : ' en stock'}**\n` +
          inStock.slice(0, 15).map((item) => `• ${item}`).join('\n') +
          (inStock.length > 15 ? `\n... et ${inStock.length - 15} autre(s) aliment(s).` : '');

      return {
        message,
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
        const matched = findBestIngredient(id, catalog);
        if (matched) id = matched;
      }
      const item = catalog[id];
      const name = item ? item.name : id;

      setPantryItem(id, args.inStock);
      const message = args.inStock
        ? `✅ **« ${name} »** marqué comme **en stock** dans le garde-manger.`
        : `✅ **« ${name} »** marqué comme **épuisé** (retiré du garde-manger).`;

      return {
        message,
        ingredientId: id,
        inStock: args.inStock,
      };
    },
  },

  // 11. Définir une préférence d'aliment pour un compte
  set_product_preference: {
    name: 'set_product_preference',
    description: 'Définir la préférence d\'un aliment pour un compte utilisateur (aimé / détesté / neutre).',
    requiresConfirmation: false,
    schema: z.object({
      ingredientId: z.string().describe('ID de l\'aliment ou nom (ex: "poulet_poitrine", "brocoli")'),
      status: z.enum(['liked', 'disliked', 'neutral']).describe('Statut de préférence ("liked", "disliked", "neutral")'),
      accountId: z.string().default('ethan').describe('Compte utilisateur cible (ethan ou laurine)'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const catalog = getMergedCatalog();
      let id = args.ingredientId;
      if (!catalog[id]) {
        const matched = findBestIngredient(id, catalog);
        if (matched) id = matched;
      }
      const item = catalog[id];
      const name = item ? item.name : id;

      setAccountPreference(accId, id, args.status);
      const statusEmoji = args.status === 'liked' ? '❤️ Aimé' : args.status === 'disliked' ? '🚫 Exclu / Détesté' : '⚪ Neutre';
      const message = `✅ **Préférence mise à jour** pour **${name}** : ${statusEmoji} (compte : **${accId}**).`;

      return {
        message,
        accountId: accId,
        ingredientId: id,
        name,
        status: args.status,
      };
    },
  },

  // 12. Rechercher des recettes
  search_recipes: {
    name: 'search_recipes',
    description: 'Rechercher des recettes dans le catalogue par nom, tag ou type de repas.',
    requiresConfirmation: false,
    schema: z.object({
      query: z.string().optional().describe('Terme de recherche'),
      mealType: z.string().optional().describe('Type de repas ("dejeuner", "diner", "souper", "collation" ou breakfast, lunch, dinner, snack)'),
    }),
    execute: async (args: any) => {
      const all = getAllAvailableRecipes();
      const normQ = normalizeText(args.query || '');
      const queryTokens = normQ.split(/\s+/).filter(Boolean);
      const targetMealType = args.mealType ? parseRecipeMealType(args.mealType) : undefined;

      const results = all.filter((r) => {
        if (targetMealType && r.mealType !== targetMealType) return false;
        if (!normQ) return true;
        const normTitle = normalizeText(r.title);
        const normTags = (r.tags || []).map(normalizeText);
        if (normTitle.includes(normQ)) return true;
        if (normTags.some((t) => t.includes(normQ))) return true;
        if (queryTokens.length > 1 && queryTokens.every((tok) => normTitle.includes(tok) || normTags.some((t) => t.includes(tok)))) return true;
        return false;
      });

      let message = '';
      if (results.length === 0) {
        const suggestions = all.slice(0, 3).map((r) => `• ${r.title} (${r.mealType})`).join('\n');
        message = `🔍 Aucune recette trouvée pour « ${args.query || ''} ».\n\n💡 Suggestions de recettes disponibles :\n${suggestions || 'Aucune recette disponible.'}`;
      } else {
        message = `🍳 **${results.length} recette${results.length > 1 ? 's trouvées' : ' trouvée'}** :\n` +
          results.slice(0, 10).map((r) => `• **${r.title}** (${r.mealType}) — ${r.caloriesPerServing} kcal, ${r.proteinPerServing}g P`).join('\n') +
          (results.length > 10 ? `\n... et ${results.length - 10} autre(s) recette(s).` : '');
      }

      return {
        message,
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

  // 13. Rechercher des aliments dans le catalogue
  search_catalog: {
    name: 'search_catalog',
    description: 'Rechercher des aliments dans le catalogue complet (Metro & produits personnalisés).',
    requiresConfirmation: false,
    schema: z.object({
      query: z.string().describe('Nom de l\'aliment à rechercher (ex: "poulet", "gruau", "lait", "boeuf")'),
    }),
    execute: async (args: any) => {
      const catalog = getMergedCatalog();
      const normQ = normalizeText(args.query || '');
      const queryTokens = normQ.split(/\s+/).filter(Boolean);

      const matches = Object.values(catalog).filter((c) => {
        if (!normQ) return true;
        const normName = normalizeText(c.name);
        const normLabel = normalizeText(c.packaging?.label || '');
        const normId = normalizeText(c.id);
        if (normName.includes(normQ) || normLabel.includes(normQ) || normId.includes(normQ)) return true;
        if (queryTokens.length > 1 && queryTokens.every((tok) => normName.includes(tok) || normLabel.includes(tok) || normId.includes(tok))) return true;
        return false;
      });

      let message = '';
      if (matches.length === 0) {
        const suggestions = Object.values(catalog).slice(0, 3).map((c) => `• ${c.name} (${c.packaging.exactPriceMetro.toFixed(2)} $)`).join('\n');
        message = `🔍 Aucun aliment trouvé dans le catalogue pour « ${args.query} ».\n\n💡 Suggestions d'aliments populaires :\n${suggestions}`;
      } else {
        message = `🛒 **${matches.length} aliment${matches.length > 1 ? 's trouvés' : ' trouvé'}** :\n` +
          matches.slice(0, 10).map((m) => `• **${m.name}** — ${m.packaging.exactPriceMetro.toFixed(2)} $ (${m.packaging.label})`).join('\n') +
          (matches.length > 10 ? `\n... et ${matches.length - 10} autre(s) aliment(s).` : '');
      }

      return {
        message,
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
      recipeId: z.string().describe('ID ou titre de la recette à supprimer'),
      confirm: z.boolean().optional().describe('Confirmer la suppression (true pour exécuter)'),
      confirmed: z.boolean().optional().describe('Alias rétrocompatible pour confirm (true pour exécuter)'),
    }),
    execute: async (args: any) => {
      const existing = findCustomRecipe(args.recipeId);
      if (!existing) {
        const available = getAllCustomRecipes().slice(0, 3).map((r) => `• ${r.title} (ID: ${r.id})`).join('\n');
        throw new Error(`Recette personnalisée introuvable pour « ${args.recipeId} » (les recettes natives Metro ne peuvent pas être supprimées).\n💡 Recettes personnalisées disponibles :\n${available || 'Aucune recette personnalisée.'}`);
      }

      const isConfirmed = Boolean(args.confirm || args.confirmed);
      if (!isConfirmed) {
        return {
          requires_confirmation: true,
          action: 'delete_recipe',
          warning: `⚠️ CONFIRMATION REQUISE : Vous êtes sur le point de SUPPRIMER DÉFINITIVEMENT la recette « ${existing.title} » (ID: ${existing.id}).`,
          instruction: `Pour confirmer la suppression, relancez l'outil avec confirm: true.`,
        };
      }

      deleteCustomRecipe(existing.id);
      return {
        message: `🗑️ Recette « ${existing.title} » (ID: ${existing.id}) supprimée définitivement de la base de données.`,
        deletedRecipeId: existing.id,
      };
    },
  },

  // 2. Modifier une recette existante (AVEC VALIDATION)
  modify_recipe: {
    name: 'modify_recipe',
    description: 'Modifier le titre, ingrédients ou étapes d\'une recette existante. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      recipeId: z.string().describe('ID ou titre de la recette à modifier'),
      title: z.string().optional().describe('Nouveau titre'),
      prepTimeMinutes: z.number().optional().describe('Temps de préparation en minutes'),
      cookTimeMinutes: z.number().optional().describe('Temps de cuisson en minutes'),
      servings: z.number().optional().describe('Nombre de portions'),
      ingredients: z.array(
        z.object({
          ingredientId: z.string().optional().describe('ID Metro ou nom courant'),
          name: z.string().optional().describe('Nom de l\'ingrédient si ingredientId omis'),
          quantity: z.union([z.number(), z.string()]).describe('Quantité numérique'),
          unit: z.string().optional().describe('Unité (g, ml, unite, etc.)'),
          calories: z.number().optional(),
          protein: z.number().optional(),
          carbs: z.number().optional(),
          fat: z.number().optional(),
        })
      ).optional().describe('Nouvelle liste d\'ingrédients'),
      instructions: z.array(z.string()).optional().describe('Nouvelles étapes de préparation'),
      confirm: z.boolean().optional().describe('Confirmer la modification (true pour exécuter)'),
      confirmed: z.boolean().optional().describe('Alias rétrocompatible pour confirm (true pour exécuter)'),
    }),
    execute: async (args: any) => {
      const existing = findCustomRecipe(args.recipeId);
      if (!existing) {
        const available = getAllCustomRecipes().slice(0, 3).map((r) => `• ${r.title} (ID: ${r.id})`).join('\n');
        throw new Error(`Recette personnalisée introuvable pour « ${args.recipeId} ».\n💡 Recettes personnalisées disponibles :\n${available || 'Aucune recette personnalisée.'}`);
      }

      const newServings = Math.max(1, args.servings ?? existing.servings);
      const isConfirmed = Boolean(args.confirm || args.confirmed);
      if (!isConfirmed) {
        return {
          requires_confirmation: true,
          action: 'modify_recipe',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez modifier la recette existante « ${existing.title} » (ID: ${existing.id}).`,
          proposedChanges: {
            title: args.title ?? existing.title,
            servings: newServings,
            prepTime: args.prepTimeMinutes ?? existing.prepTimeMinutes,
            cookTime: args.cookTimeMinutes ?? existing.cookTimeMinutes,
            ingredientsCount: args.ingredients ? args.ingredients.length : existing.ingredients.length,
          },
          instruction: `Demandez à l'utilisateur : « Confirmez-vous l'application de ces modifications à la recette ? ». Si oui, réexécutez avec confirm=true.`,
        };
      }

      const catalog = getMergedCatalog();
      let resolvedIngredients = existing.ingredients;
      let finalCalories = existing.caloriesPerServing;
      let finalProtein = existing.proteinPerServing;
      let finalCarbs = existing.carbsPerServing;
      let finalFat = existing.fatPerServing;

      if (args.ingredients) {
        resolvedIngredients = args.ingredients.map((ing: any) => {
          const raw = (ing.ingredientId || ing.name || '').trim();
          const matched = findBestIngredient(raw, catalog);
          const finalId = matched || raw || 'custom_item';
          const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity) || 1;
          const unit = ing.unit || catalog[finalId]?.baseUnit || 'g';
          return { ingredientId: finalId, quantity: qty, unit };
        });

        const nutrients = calculateRecipeNutrients(resolvedIngredients, newServings, catalog);
        finalCalories = nutrients.caloriesPerServing;
        finalProtein = nutrients.proteinPerServing;
        finalCarbs = nutrients.carbsPerServing;
        finalFat = nutrients.fatPerServing;
      } else if (args.servings !== undefined && newServings > 0 && existing.servings > 0 && newServings !== existing.servings) {
        finalCalories = Math.round((existing.caloriesPerServing * existing.servings) / newServings);
        finalProtein = Math.round(((existing.proteinPerServing * existing.servings) / newServings) * 10) / 10;
        finalCarbs = Math.round(((existing.carbsPerServing * existing.servings) / newServings) * 10) / 10;
        finalFat = Math.round(((existing.fatPerServing * existing.servings) / newServings) * 10) / 10;
      }

      const updated = saveCustomRecipe({
        ...existing,
        title: args.title ?? existing.title,
        prepTimeMinutes: args.prepTimeMinutes ?? existing.prepTimeMinutes,
        cookTimeMinutes: args.cookTimeMinutes ?? existing.cookTimeMinutes,
        servings: newServings,
        ingredients: resolvedIngredients,
        instructions: args.instructions ?? existing.instructions,
        caloriesPerServing: finalCalories,
        proteinPerServing: finalProtein,
        carbsPerServing: finalCarbs,
        fatPerServing: finalFat,
      }, catalog);

      return {
        message: `✏️ Recette « ${updated.title} » modifiée avec succès (${updated.servings} portion${updated.servings > 1 ? 's' : ''}, ${updated.caloriesPerServing} kcal, ${updated.proteinPerServing}g P).`,
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
      accountId: z.string().default('ethan').describe('Compte cible (ethan ou laurine)'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour (ex: "Lundi", "Monday" ou 0-6)'),
      mealSlot: z.string().describe('Créneau du repas (breakfast/dejeuner, lunch/diner, dinner/souper, snack/collation)'),
      confirm: z.boolean().optional().describe('Confirmer l\'action (true pour exécuter)'),
      confirmed: z.boolean().optional().describe('Alias rétrocompatible pour confirm (true pour exécuter)'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const dayIndex = parseDayIndex(args.day);
      const slot = parseMealSlot(args.mealSlot);
      const dayName = DAY_NAMES[dayIndex];
      const isConfirmed = Boolean(args.confirm || args.confirmed);

      if (!isConfirmed) {
        return {
          requires_confirmation: true,
          action: 'remove_scheduled_meal',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez retirer le plat programmé le ${dayName} (${slot}) pour ${accId}.`,
          instruction: `Demandez confirmation à l'utilisateur avant d'effacer ce créneau. Si accord, rappelez avec confirm=true.`,
        };
      }

      deleteScheduledMeal(accId, dayIndex, slot);
      return {
        message: `🗑️ Plat déprogrammé pour ${accId} le ${dayName} (${slot}).`,
      };
    },
  },

  // 4. Vider le planning complet d'un jour (AVEC VALIDATION)
  clear_day_schedule: {
    name: 'clear_day_schedule',
    description: 'Effacer tous les repas programmés pour un jour donné. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      accountId: z.string().default('ethan').describe('Compte cible (ethan ou laurine)'),
      day: z.union([z.number().min(0).max(6), z.string()]).describe('Jour (ex: "Lundi", "Monday" ou 0-6)'),
      confirm: z.boolean().optional().describe('Confirmer l\'action (true pour exécuter)'),
      confirmed: z.boolean().optional().describe('Alias rétrocompatible pour confirm (true pour exécuter)'),
    }),
    execute: async (args: any) => {
      const accId = parseAccountId(args.accountId);
      const dayIndex = parseDayIndex(args.day);
      const dayName = DAY_NAMES[dayIndex];
      const isConfirmed = Boolean(args.confirm || args.confirmed);

      if (!isConfirmed) {
        return {
          requires_confirmation: true,
          action: 'clear_day_schedule',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez vider TOUS les repas prévus le ${dayName} pour ${accId}.`,
          instruction: `Demandez à l'utilisateur : « Confirmez-vous la réinitialisation complète des repas du ${dayName} pour ${accId} ? ». Si oui, confirmez avec confirm=true.`,
        };
      }

      clearDaySchedule(accId, dayIndex);
      return {
        message: `🗑️ Tous les repas du ${dayName} ont été vidés pour ${accId}.`,
      };
    },
  },

  // 5. Supprimer un aliment personnalisé (AVEC VALIDATION)
  delete_custom_product: {
    name: 'delete_custom_product',
    description: 'Supprimer définitivement un aliment personnalisé du catalogue. [ATTENTION : Requiert confirmation humaine]',
    requiresConfirmation: true,
    schema: z.object({
      productId: z.string().describe('ID ou nom de l\'aliment personnalisé à supprimer'),
      confirm: z.boolean().optional().describe('Confirmer l\'action (true pour exécuter)'),
      confirmed: z.boolean().optional().describe('Alias rétrocompatible pour confirm (true pour exécuter)'),
    }),
    execute: async (args: any) => {
      const target = findCustomProduct(args.productId);
      if (!target) {
        const available = getCustomProducts().slice(0, 3).map((p) => `• ${p.name} (ID: ${p.id})`).join('\n');
        throw new Error(`Aliment personnalisé introuvable avec l'identifiant ou le nom « ${args.productId} » (les aliments de base Metro ne peuvent pas être supprimés).\n💡 Produits personnalisés existants :\n${available || 'Aucun produit personnalisé.'}`);
      }

      const isConfirmed = Boolean(args.confirm || args.confirmed);
      if (!isConfirmed) {
        return {
          requires_confirmation: true,
          action: 'delete_custom_product',
          warning: `⚠️ CONFIRMATION REQUISE : Vous allez supprimer définitivement l'aliment « ${target.name} » (ID: ${target.id}) du catalogue.`,
          instruction: `Demandez confirmation à l'utilisateur avant de supprimer cet aliment. Si accord, rappelez avec confirm=true.`,
        };
      }

      deleteCustomProduct(target.id);
      return {
        message: `🗑️ Aliment « ${target.name} » supprimé définitivement du catalogue.`,
        deletedProductId: target.id,
      };
    },
  },
};

export const ALL_TOOLS = {
  ...toolSchemas,
  ...toolSchemasWithConfirmation,
};
