import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
  getDatabase,
  getDbPath,
  resetDatabaseInstance,
  saveCustomRecipe,
  getCustomRecipeById,
  getAllCustomRecipes,
  getScheduledMeals,
  getCustomProducts,
} from '../src/lib/db';
import { INGREDIENTS } from '../src/data/ingredients';
import {
  normalizeText,
  parseDayIndex,
  parseMealSlot,
  parseAisle,
  parseUnit,
  parseAccountId,
  findBestIngredient,
  findCustomRecipe,
  findCustomProduct,
  ALL_TOOLS,
  toolSchemas,
  toolSchemasWithConfirmation,
  DAY_NAMES,
} from '../src/mcp/tools';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(msg);
  }
}

async function record(category: string, name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      await res;
    }
    results.push({ category, name, passed: true });
  } catch (err: any) {
    results.push({ category, name, passed: false, error: err?.message || String(err) });
  }
}

async function runAllTests() {
  console.log('=== STARTING CHALLENGER M1 ADVERSARIAL STRESS TEST ===\n');

  // STEP 0: Check initial DB path and isolation
  const initialDbPath = getDbPath();
  const tempDbPath = path.join(os.tmpdir(), `challenger_m1_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.sqlite`);
  process.env.FOOD_PLANNER_DB_PATH = tempDbPath;

  console.log(`[Isolation] Default DB path: ${initialDbPath}`);
  console.log(`[Isolation] Isolated temp DB path: ${process.env.FOOD_PLANNER_DB_PATH}`);

  // Test 1: Verify getDbPath honors environment variable
  await record('Isolation', 'getDbPath respects FOOD_PLANNER_DB_PATH', () => {
    assert(getDbPath() === tempDbPath, `Expected ${tempDbPath}, got ${getDbPath()}`);
  });

  // Test 2: Verify DB initialization creates temp database file
  await record('Isolation', 'Database initializes in temp path and creates tables', () => {
    const db = getDatabase();
    assert(fs.existsSync(tempDbPath), 'Temp SQLite file does not exist on disk');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);
    assert(tableNames.includes('custom_recipes'), 'custom_recipes table missing');
    assert(tableNames.includes('scheduled_meals'), 'scheduled_meals table missing');
    assert(tableNames.includes('custom_products'), 'custom_products table missing');
  });

  // ==========================================
  // CATEGORY 1: Natural Language Days Parsing
  // ==========================================
  const validEnglishDays: [string, number][] = [
    ['Monday', 0], ['Tuesday', 1], ['Wednesday', 2], ['Thursday', 3], ['Friday', 4], ['Saturday', 5], ['Sunday', 6],
    ['monday', 0], ['tuesday', 1], ['wednesday', 2], ['thursday', 3], ['friday', 4], ['saturday', 5], ['sunday', 6],
    ['MONDAY', 0], ['WEDNESDAY', 2], ['FRIDAY', 4],
    ['  Monday  ', 0], ['  Wednesday ', 2], ['   friday   ', 4],
    ['mon', 0], ['tue', 1], ['wed', 2], ['thu', 3], ['fri', 4], ['sat', 5], ['sun', 6],
    ['  mon  ', 0], ['  Wed  ', 2], ['FRI', 4],
  ];

  for (const [input, expected] of validEnglishDays) {
    await record('NLP Days', `English day "${input}" resolves to index ${expected}`, () => {
      const idx = parseDayIndex(input);
      assert(idx === expected, `Expected ${expected} for "${input}", got ${idx}`);
    });
  }

  const validFrenchDays: [string, number][] = [
    ['Lundi', 0], ['Mardi', 1], ['Mercredi', 2], ['Jeudi', 3], ['Vendredi', 4], ['Samedi', 5], ['Dimanche', 6],
    ['lundi', 0], ['mardi', 1], ['mercredi', 2], ['jeudi', 3], ['vendredi', 4], ['samedi', 5], ['dimanche', 6],
    ['LUNDI', 0], ['MERCREDI', 2], ['VENDREDI', 4],
    ['  lundi  ', 0], ['  mercredi ', 2], ['   vendredi   ', 4],
    ['lun', 0], ['mar', 1], ['mer', 2], ['jeu', 3], ['ven', 4], ['sam', 5], ['dim', 6],
    ['  lun  ', 0], ['  Mer  ', 2], ['VEN', 4],
  ];

  for (const [input, expected] of validFrenchDays) {
    await record('NLP Days', `French day "${input}" resolves to index ${expected}`, () => {
      const idx = parseDayIndex(input);
      assert(idx === expected, `Expected ${expected} for "${input}", got ${idx}`);
    });
  }

  const numericDays: [number | string, number][] = [
    [0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6],
    ['0', 0], ['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
    ['  0  ', 0], ['  6  ', 6],
  ];

  for (const [input, expected] of numericDays) {
    await record('NLP Days', `Numeric day ${JSON.stringify(input)} resolves to ${expected}`, () => {
      const idx = parseDayIndex(input as any);
      assert(idx === expected, `Expected ${expected} for ${input}, got ${idx}`);
    });
  }

  const invalidDays = ['someday', '10', '', 'yesterday', 'tomorrow', 'funday', 'lundi matin', -1, 7, 99];
  for (const inv of invalidDays) {
    await record('NLP Days', `Invalid day ${JSON.stringify(inv)} throws descriptive error`, () => {
      let threw = false;
      try {
        parseDayIndex(inv as any);
      } catch (e: any) {
        threw = true;
        assert(e.message.includes('invalide') || e.message.includes('non reconnu'), `Error message missing helpful text: ${e.message}`);
      }
      assert(threw, `Expected parseDayIndex to throw for input ${JSON.stringify(inv)}`);
    });
  }

  // ==========================================
  // CATEGORY 2: Meal Slot Variations
  // ==========================================
  const mealSlotCases: [string | undefined, 'breakfast' | 'lunch' | 'dinner' | 'snack'][] = [
    // Breakfast
    ['breakfast', 'breakfast'],
    ['BREAKFAST', 'breakfast'],
    ['petit-déjeuner', 'breakfast'],
    ['petit déjeuner', 'breakfast'],
    ['petit-dejeuner', 'breakfast'],
    ['petitdej', 'breakfast'],
    ['matin', 'breakfast'],
    ['morning', 'breakfast'],
    ['déjeuner', 'breakfast'],
    ['dejeuner', 'breakfast'],
    // Lunch
    ['lunch', 'lunch'],
    ['LUNCH', 'lunch'],
    ['midi', 'lunch'],
    ['MIDI', 'lunch'],
    ['dîner', 'lunch'],
    ['diner', 'lunch'],
    // Dinner
    ['dinner', 'dinner'],
    ['DINNER', 'dinner'],
    ['souper', 'dinner'],
    ['SOUPER', 'dinner'],
    ['soir', 'dinner'],
    ['soiree', 'dinner'],
    ['evening', 'dinner'],
    // Snack
    ['snack', 'snack'],
    ['SNACK', 'snack'],
    ['collation', 'snack'],
    ['COLLATION', 'snack'],
    ['gouter', 'snack'],
    ['goûter', 'snack'],
    ['4h', 'snack'],
    ['quatreheures', 'snack'],
    // Fallback
    [undefined, 'lunch'],
    ['', 'lunch'],
    ['unknown_slot', 'lunch'],
  ];

  for (const [input, expected] of mealSlotCases) {
    await record('NLP Slots', `Meal slot "${input}" resolves to "${expected}"`, () => {
      const slot = parseMealSlot(input);
      assert(slot === expected, `Expected ${expected} for "${input}", got ${slot}`);
    });
  }

  // ==========================================
  // CATEGORY 3: Ligatures and Accent Normalization
  // ==========================================
  await record('NLP Ligatures', 'normalizeText handles "œ" and "æ" ligature decomposition', () => {
    assert(normalizeText('bœuf haché maigre') === 'boeuf hache maigre', `Failed for "bœuf haché maigre": ${normalizeText('bœuf haché maigre')}`);
    assert(normalizeText('BŒUF HACHÉ') === 'boeuf hache', `Failed for "BŒUF HACHÉ": ${normalizeText('BŒUF HACHÉ')}`);
    assert(normalizeText('cæcum') === 'caecum', `Failed for "cæcum": ${normalizeText('cæcum')}`);
    assert(normalizeText('CÆCUM') === 'caecum', `Failed for "CÆCUM": ${normalizeText('CÆCUM')}`);
    assert(normalizeText('œuf') === 'oeuf', `Failed for "œuf": ${normalizeText('œuf')}`);
    assert(normalizeText('ŒUFS') === 'oeufs', `Failed for "ŒUFS": ${normalizeText('ŒUFS')}`);
  });

  await record('NLP Catalog Search', 'search_catalog matches ligature word "bœuf"', async () => {
    const res = await ALL_TOOLS.search_catalog.execute({ query: 'bœuf' });
    assert(res.count > 0, 'No items found for "bœuf"');
    const hasBoeuf = res.items.some((i: any) => i.id.includes('boeuf') || i.name.toLowerCase().includes('boeuf'));
    assert(hasBoeuf, 'Results did not include boeuf item');
  });

  await record('NLP Catalog Search', 'search_catalog matches "bœuf haché maigre"', async () => {
    const res = await ALL_TOOLS.search_catalog.execute({ query: 'bœuf haché maigre' });
    assert(res.count > 0, 'No items found for "bœuf haché maigre"');
    assert(res.items[0].id === 'boeuf_hache_maigre', `Expected boeuf_hache_maigre, got ${res.items[0].id}`);
  });

  await record('NLP Catalog Search', 'search_catalog matches ligature word "œufs"', async () => {
    const res = await ALL_TOOLS.search_catalog.execute({ query: 'œufs' });
    assert(res.count > 0, 'No items found for "œufs"');
    const hasEggs = res.items.some((i: any) => i.id.includes('oeuf') || i.name.toLowerCase().includes('oeuf'));
    assert(hasEggs, 'Results did not include egg item');
  });

  // ==========================================
  // CATEGORY 4: Fuzzy Ingredient Matching & create_recipe
  // ==========================================
  await record('Fuzzy Recipe', 'create_recipe resolves French fuzzy ingredients, computes macros & cost', async () => {
    const res = await ALL_TOOLS.create_recipe.execute({
      title: 'Chili Con Carne Test',
      mealType: 'souper',
      servings: 2,
      ingredients: [
        { ingredientId: 'bœuf haché maigre', quantity: 200, unit: 'g' },
        { ingredientId: 'champignons', quantity: 100, unit: 'g' },
        { ingredientId: 'riz basmati', quantity: 120, unit: 'g' },
      ],
      instructions: ['Cuire la viande', 'Ajouter les champignons', 'Servir avec le riz'],
    });

    assert(res.recipe.id.startsWith('custom_recipe_'), 'Recipe ID missing prefix');
    assert(res.recipe.title === 'Chili Con Carne Test', 'Title mismatch');
    assert(res.recipe.mealType === 'souper', 'Meal type mismatch');
    assert(res.recipe.servings === 2, 'Servings mismatch');
    assert(res.recipe.macrosPerServing.calories > 0, `Expected calories > 0, got ${res.recipe.macrosPerServing.calories}`);
    assert(parseFloat(res.recipe.macrosPerServing.protein) > 0, 'Expected protein > 0');
    assert(res.recipe.estimatedCostTotal !== undefined, 'Estimated total cost missing');
    assert(res.recipe.matchedIngredients.length === 3, 'Matched ingredients count mismatch');
    
    // Verify resolved IDs
    const beef = res.recipe.matchedIngredients.find((i: any) => i.id === 'boeuf_hache_maigre');
    assert(beef !== undefined, 'Failed to map "bœuf haché maigre" to boeuf_hache_maigre');
    const mushrooms = res.recipe.matchedIngredients.find((i: any) => i.id === 'champignons_blancs');
    assert(mushrooms !== undefined, 'Failed to map "champignons" to champignons_blancs');
    const rice = res.recipe.matchedIngredients.find((i: any) => i.id === 'riz_basmati');
    assert(rice !== undefined, 'Failed to map "riz basmati" to riz_basmati');
  });

  await record('Fuzzy Recipe', 'create_recipe resolves English ingredient names', async () => {
    const res = await ALL_TOOLS.create_recipe.execute({
      title: 'Chicken Rice Bowl Test',
      mealType: 'dinner',
      servings: 1,
      ingredients: [
        { ingredientId: 'chicken breast', quantity: 180, unit: 'g' },
        { ingredientId: 'white rice', quantity: 100, unit: 'g' },
        { ingredientId: 'large eggs', quantity: 2, unit: 'unite' },
      ],
    });

    assert(res.recipe.macrosPerServing.calories > 0, 'Calories should be > 0');
    const chicken = res.recipe.matchedIngredients.find((i: any) => i.id === 'poulet_poitrine');
    assert(chicken !== undefined, 'Failed to map "chicken breast" to poulet_poitrine');
    const eggs = res.recipe.matchedIngredients.find((i: any) => i.id === 'oeufs_larges' || i.id === 'oeufs_gros');
    assert(eggs !== undefined, 'Failed to map "large eggs" to oeufs');
  });

  // Adversarial finding: False-positive matching in findBestIngredient on short tokens
  await record('Adversarial Bug Check', 'findBestIngredient false positive: "brownies" maps to oat milk because of "own"', () => {
    const catalog = INGREDIENTS;
    const matched = findBestIngredient('brownies', catalog);
    // Documenting this behavior: does it match lait_avoine_earth_own?
    if (matched === 'lait_avoine_earth_own') {
      console.log('⚠️ [Adversarial finding confirmed] "brownies" matches "lait_avoine_earth_own" due to unconstrained substring token match "own"');
    }
  });

  // Adversarial finding: SQLite binding crash when amount is omitted in add_custom_product
  await record('Adversarial Bug Check', 'add_custom_product crashes with undefined parameter if amount is omitted', async () => {
    let threwBindingError = false;
    try {
      await ALL_TOOLS.add_custom_product.execute({
        name: 'Produit Sans Amount',
        price: 5.0,
        caloriesPer100g: 100,
        proteinPer100g: 10,
      });
    } catch (e: any) {
      if (e.message.includes('parameter 14') || e.message.includes('cannot be bound')) {
        threwBindingError = true;
        console.log('⚠️ [Adversarial finding confirmed] add_custom_product fails with SQLite parameter 14 binding error when amount is omitted:', e.message);
      }
    }
    assert(threwBindingError, 'Expected add_custom_product to reproduce SQLite parameter 14 error when amount is omitted');
  });

  // ==========================================
  // CATEGORY 5: 5 Destructive Confirmation Flows
  // ==========================================

  // Tool 1: delete_recipe
  await record('Destructive delete_recipe', 'unconfirmed call (no confirm) refuses deletion and returns structured warning', async () => {
    const created = saveCustomRecipe({ title: 'Recipe To Delete 1', caloriesPerServing: 200 });
    const res = await ALL_TOOLS.delete_recipe.execute({ recipeId: created.id });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    assert(res.action === 'delete_recipe', `Expected action: delete_recipe, got ${res.action}`);
    assert(typeof res.warning === 'string' && res.warning.includes('⚠️ CONFIRMATION REQUISE'), 'Warning message missing');
    assert(typeof res.instruction === 'string' && res.instruction.includes('confirm: true'), 'Instruction missing');

    const check = getCustomRecipeById(created.id);
    assert(check !== null, 'Recipe was deleted when confirmation was omitted!');
  });

  await record('Destructive delete_recipe', 'unconfirmed call (confirm: false) refuses deletion', async () => {
    const created = saveCustomRecipe({ title: 'Recipe To Delete 2', caloriesPerServing: 200 });
    const res = await ALL_TOOLS.delete_recipe.execute({ recipeId: created.id, confirm: false });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    const check = getCustomRecipeById(created.id);
    assert(check !== null, 'Recipe was deleted when confirm: false!');
  });

  await record('Destructive delete_recipe', 'unconfirmed call (confirmed: false) refuses deletion', async () => {
    const created = saveCustomRecipe({ title: 'Recipe To Delete 3', caloriesPerServing: 200 });
    const res = await ALL_TOOLS.delete_recipe.execute({ recipeId: created.id, confirmed: false });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    const check = getCustomRecipeById(created.id);
    assert(check !== null, 'Recipe was deleted when confirmed: false!');
  });

  await record('Destructive delete_recipe', 'confirmed call (confirm: true) executes deletion', async () => {
    const created = saveCustomRecipe({ title: 'Recipe To Delete 4', caloriesPerServing: 200 });
    const res: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: created.id, confirm: true });
    assert(res.deletedRecipeId === created.id, `Expected deletedRecipeId ${created.id}, got ${res.deletedRecipeId}`);
    assert(res.message.includes('supprimée définitivement'), 'Confirmation message missing');

    const check = getCustomRecipeById(created.id);
    assert(check === null, 'Recipe still exists in DB after confirmed deletion!');
  });

  await record('Destructive delete_recipe', 'confirmed call (confirmed: true) executes deletion by recipe title', async () => {
    const created = saveCustomRecipe({ title: 'Unique Title To Delete', caloriesPerServing: 200 });
    const res = await ALL_TOOLS.delete_recipe.execute({ recipeId: 'Unique Title To Delete', confirmed: true });
    assert(res.deletedRecipeId === created.id, `Expected deletedRecipeId ${created.id}`);
    const check = getCustomRecipeById(created.id);
    assert(check === null, 'Recipe still exists in DB after deletion by title!');
  });

  await record('Destructive delete_recipe', 'both confirm: true AND confirmed: true works cleanly', async () => {
    const created = saveCustomRecipe({ title: 'Dual Confirm Delete', caloriesPerServing: 200 });
    const res = await ALL_TOOLS.delete_recipe.execute({ recipeId: created.id, confirm: true, confirmed: true });
    assert(res.deletedRecipeId === created.id, 'Failed dual confirmation');
    assert(getCustomRecipeById(created.id) === null, 'Recipe still exists');
  });

  await record('Destructive delete_recipe', 'deleting nonexistent recipe throws error with suggestions', async () => {
    let threw = false;
    try {
      await ALL_TOOLS.delete_recipe.execute({ recipeId: 'nonexistent_recipe_123', confirm: true });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('introuvable'), `Error message missing "introuvable": ${e.message}`);
    }
    assert(threw, 'Expected delete_recipe on nonexistent to throw');
  });

  // Tool 2: modify_recipe
  await record('Destructive modify_recipe', 'unconfirmed call (no confirm) returns preview without modifying DB', async () => {
    const created = saveCustomRecipe({ title: 'Original Modify Title', servings: 1, caloriesPerServing: 300 });
    const res = await ALL_TOOLS.modify_recipe.execute({
      recipeId: created.id,
      title: 'Modified Title Attempt',
      servings: 4,
    });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    assert(res.action === 'modify_recipe', 'Action mismatch');
    assert(res.proposedChanges?.title === 'Modified Title Attempt', 'Proposed changes title mismatch');
    assert(res.proposedChanges?.servings === 4, 'Proposed changes servings mismatch');

    const check = getCustomRecipeById(created.id);
    assert(check?.title === 'Original Modify Title', `DB was mutated prematurely: ${check?.title}`);
    assert(check?.servings === 1, `DB servings mutated prematurely: ${check?.servings}`);
  });

  await record('Destructive modify_recipe', 'unconfirmed call (confirm: false) does not modify DB', async () => {
    const created = saveCustomRecipe({ title: 'Original Modify Title 2', servings: 2 });
    const res = await ALL_TOOLS.modify_recipe.execute({
      recipeId: created.id,
      title: 'Another Attempt',
      confirm: false,
    });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    const check = getCustomRecipeById(created.id);
    assert(check?.title === 'Original Modify Title 2', 'DB was mutated');
  });

  await record('Destructive modify_recipe', 'confirmed call (confirm: true) executes modification and recalculates macros', async () => {
    const created = saveCustomRecipe({
      title: 'Recipe Before Mod',
      servings: 1,
      ingredients: [{ ingredientId: 'riz_basmati', quantity: 100, unit: 'g' }],
    });

    const res: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: created.id,
      title: 'Recipe After Mod',
      servings: 2,
      ingredients: [
        { ingredientId: 'poulet_poitrine', quantity: 200, unit: 'g' },
      ],
      confirm: true,
    });

    assert(res.recipe.title === 'Recipe After Mod', 'Returned title mismatch');
    assert(res.recipe.servings === 2, 'Returned servings mismatch');
    assert(res.recipe.proteinPerServing > 0, 'Recalculated protein should be > 0');

    const check = getCustomRecipeById(created.id);
    assert(check?.title === 'Recipe After Mod', 'DB title mismatch');
    assert(check?.servings === 2, 'DB servings mismatch');
    assert(check?.ingredients[0].ingredientId === 'poulet_poitrine', 'DB ingredients mismatch');
  });

  await record('Destructive modify_recipe', 'confirmed call (confirmed: true) works by recipe title', async () => {
    const created = saveCustomRecipe({ title: 'Recipe Title Lookup Mod', servings: 1 });
    const res: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: 'Recipe Title Lookup Mod',
      title: 'Recipe Title Lookup Mod Updated',
      confirmed: true,
    });
    assert(res.recipe.title === 'Recipe Title Lookup Mod Updated', 'Failed update by title');
    const check = getCustomRecipeById(created.id);
    assert(check?.title === 'Recipe Title Lookup Mod Updated', 'DB title mismatch');
  });

  // Tool 3: remove_scheduled_meal
  await record('Destructive remove_scheduled_meal', 'unconfirmed call (no confirm) returns preview without deleting meal', async () => {
    const created = saveCustomRecipe({ title: 'Meal To Schedule & Remove' });
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'Wednesday',
      mealSlot: 'lunch',
      recipeId: created.id,
    });

    let meals = getScheduledMeals('ethan');
    let scheduled = meals.find((m) => m.dayIndex === 2 && m.mealSlot === 'lunch');
    assert(scheduled !== undefined, 'Meal was not scheduled');

    const res: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'Wednesday',
      mealSlot: 'lunch',
    });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    assert(res.action === 'remove_scheduled_meal', 'Action mismatch');
    assert(res.warning.includes('Mercredi'), 'Warning missing day name');

    meals = getScheduledMeals('ethan');
    scheduled = meals.find((m) => m.dayIndex === 2 && m.mealSlot === 'lunch');
    assert(scheduled !== undefined, 'Meal was deleted on unconfirmed call!');
  });

  await record('Destructive remove_scheduled_meal', 'confirmed call (confirm: true) removes scheduled meal', async () => {
    const res: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'Wednesday',
      mealSlot: 'lunch',
      confirm: true,
    });
    assert(res.message.includes('déprogrammé'), 'Confirmation message missing');

    const meals = getScheduledMeals('ethan');
    const scheduled = meals.find((m) => m.dayIndex === 2 && m.mealSlot === 'lunch');
    assert(scheduled === undefined, 'Meal still scheduled after confirm: true!');
  });

  await record('Destructive remove_scheduled_meal', 'confirmed call (confirmed: true) removes scheduled meal on French day', async () => {
    const created = saveCustomRecipe({ title: 'Friday Dinner Recipe' });
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'laurine',
      day: 'Vendredi',
      mealSlot: 'soir',
      recipeId: created.id,
    });

    const res: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'laurine',
      day: 'vendredi',
      mealSlot: 'dinner',
      confirmed: true,
    });
    assert(res.message.includes('déprogrammé'), 'Confirmation message missing');

    const meals = getScheduledMeals('laurine');
    const scheduled = meals.find((m) => m.dayIndex === 4 && m.mealSlot === 'dinner');
    assert(scheduled === undefined, 'Meal still scheduled after confirmed: true!');
  });

  // Tool 4: clear_day_schedule
  await record('Destructive clear_day_schedule', 'unconfirmed call (no confirm) returns preview without deleting, dayName interpolated correctly', async () => {
    const created = saveCustomRecipe({ title: 'Schedule Meal Monday' });
    await ALL_TOOLS.schedule_meal.execute({ accountId: 'ethan', day: 'Monday', mealSlot: 'breakfast', recipeId: created.id });
    await ALL_TOOLS.schedule_meal.execute({ accountId: 'ethan', day: 'Monday', mealSlot: 'dinner', recipeId: created.id });

    let meals = getScheduledMeals('ethan').filter((m) => m.dayIndex === 0);
    assert(meals.length >= 2, 'Meals not scheduled on Monday');

    const res: any = await ALL_TOOLS.clear_day_schedule.execute({
      accountId: 'ethan',
      day: 'Monday',
    });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    assert(res.action === 'clear_day_schedule', 'Action mismatch');
    assert(!res.warning.includes('${dayName}'), 'Literal ${dayName} un-interpolated template bug detected!');
    assert(res.warning.includes('Lundi'), 'Warning should mention Lundi');

    meals = getScheduledMeals('ethan').filter((m) => m.dayIndex === 0);
    assert(meals.length >= 2, 'Meals were cleared on unconfirmed call!');
  });

  await record('Destructive clear_day_schedule', 'confirmed call (confirm: true) clears all meals for that day', async () => {
    const res: any = await ALL_TOOLS.clear_day_schedule.execute({
      accountId: 'ethan',
      day: 'Monday',
      confirm: true,
    });
    assert(res.message.includes('vidés'), 'Confirmation message missing');

    const meals = getScheduledMeals('ethan').filter((m) => m.dayIndex === 0);
    assert(meals.length === 0, `Expected 0 meals on Monday, found ${meals.length}`);
  });

  await record('Destructive clear_day_schedule', 'confirmed call (confirmed: true) clears schedule with numeric day', async () => {
    const created = saveCustomRecipe({ title: 'Schedule Tuesday' });
    await ALL_TOOLS.schedule_meal.execute({ accountId: 'laurine', day: 1, mealSlot: 'lunch', recipeId: created.id });

    const res: any = await ALL_TOOLS.clear_day_schedule.execute({
      accountId: 'laurine',
      day: '1',
      confirmed: true,
    });
    assert(res.message.includes('vidés'), 'Confirmation message missing');

    const meals = getScheduledMeals('laurine').filter((m) => m.dayIndex === 1);
    assert(meals.length === 0, 'Meals not cleared');
  });

  // Tool 5: delete_custom_product
  await record('Destructive delete_custom_product', 'unconfirmed call (no confirm) returns preview without deleting product', async () => {
    const created = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Test Confirmation',
      aisle: 'boulangerie',
      price: 3.99,
      amount: 400,
      unit: 'g',
      caloriesPer100g: 250,
      proteinPer100g: 8,
    });

    const prodId = created.product.id;
    let products = getCustomProducts();
    assert(products.some((p) => p.id === prodId), 'Product was not created in DB');

    const res: any = await ALL_TOOLS.delete_custom_product.execute({ productId: prodId });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
    assert(res.action === 'delete_custom_product', 'Action mismatch');
    assert(res.warning.includes('Produit Test Confirmation'), 'Warning missing product name');

    products = getCustomProducts();
    assert(products.some((p) => p.id === prodId), 'Product deleted on unconfirmed call!');
  });

  await record('Destructive delete_custom_product', 'unconfirmed call (confirm: false) refuses deletion', async () => {
    const products = getCustomProducts();
    const prod = products.find((p) => p.name === 'Produit Test Confirmation')!;
    assert(prod !== undefined, 'Product missing');
    const res: any = await ALL_TOOLS.delete_custom_product.execute({ productId: prod.id, confirm: false });
    assert(res.requires_confirmation === true, 'Expected requires_confirmation: true');
  });

  await record('Destructive delete_custom_product', 'confirmed call (confirm: true) executes deletion', async () => {
    const products = getCustomProducts();
    const prod = products.find((p) => p.name === 'Produit Test Confirmation')!;
    assert(prod !== undefined, 'Product missing');

    const res: any = await ALL_TOOLS.delete_custom_product.execute({ productId: prod.id, confirm: true });
    assert(res.deletedProductId === prod.id, 'Deleted ID mismatch');
    assert(res.message.includes('supprimé définitivement'), 'Confirmation message missing');

    const updated = getCustomProducts();
    assert(!updated.some((p) => p.id === prod.id), 'Product still exists in DB after confirmed deletion!');
  });

  await record('Destructive delete_custom_product', 'confirmed call (confirmed: true) deletes by product name (with amount specified)', async () => {
    const created = await ALL_TOOLS.add_custom_product.execute({
      name: 'Fromage Chevre Artisanal Unique',
      aisle: 'produits_laitiers',
      price: 6.49,
      amount: 200,
      caloriesPer100g: 300,
      proteinPer100g: 18,
    });

    const res = await ALL_TOOLS.delete_custom_product.execute({
      productId: 'Fromage Chevre Artisanal Unique',
      confirmed: true,
    });
    assert(res.deletedProductId === created.product.id, 'Deleted product ID mismatch');

    const updated = getCustomProducts();
    assert(!updated.some((p) => p.id === created.product.id), 'Product still exists in DB!');
  });

  await record('Destructive delete_custom_product', 'deleting nonexistent custom product throws error with suggestions', async () => {
    let threw = false;
    try {
      await ALL_TOOLS.delete_custom_product.execute({ productId: 'produit_totalement_inconnu_xyz', confirm: true });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('introuvable'), `Error missing introuvable: ${e.message}`);
    }
    assert(threw, 'Expected delete_custom_product on nonexistent to throw');
  });

  // ==========================================
  // CATEGORY 6: All 18 Tools Audit & Ergonomics
  // ==========================================
  await record('Audit Tools', 'ALL_TOOLS contains exactly 18 tools', () => {
    const keys = Object.keys(ALL_TOOLS);
    assert(keys.length === 18, `Expected 18 tools, found ${keys.length}: ${keys.join(', ')}`);
  });

  const expected18Tools = [
    'create_recipe',
    'schedule_meal',
    'update_catalog_item_price',
    'add_custom_product',
    'get_daily_plan',
    'get_macro_status',
    'get_grocery_list',
    'add_to_grocery_list',
    'get_pantry_items',
    'toggle_pantry_item',
    'set_product_preference',
    'search_recipes',
    'search_catalog',
    'delete_recipe',
    'modify_recipe',
    'remove_scheduled_meal',
    'clear_day_schedule',
    'delete_custom_product',
  ];

  for (const toolName of expected18Tools) {
    await record('Audit Tools', `Tool "${toolName}" is registered and has schema and execute`, () => {
      const tool = (ALL_TOOLS as any)[toolName];
      assert(tool !== undefined, `Tool ${toolName} missing from ALL_TOOLS`);
      assert(typeof tool.execute === 'function', `Tool ${toolName}.execute is not a function`);
      assert(tool.schema !== undefined, `Tool ${toolName}.schema is undefined`);
    });
  }

  // Test set_product_preference
  await record('Tool set_product_preference', 'sets liked, disliked, and neutral preferences for both accounts', async () => {
    const res1 = await ALL_TOOLS.set_product_preference.execute({
      accountId: 'ethan',
      ingredientId: 'poulet_poitrine',
      status: 'liked',
    });
    assert(res1.status === 'liked', 'Status mismatch');
    assert(res1.message.includes('Aimé'), 'Message missing liked emoji');

    const res2 = await ALL_TOOLS.set_product_preference.execute({
      accountId: 'laurine',
      ingredientId: 'champignons_blancs',
      status: 'disliked',
    });
    assert(res2.status === 'disliked', 'Status mismatch');
    assert(res2.message.includes('Exclu'), 'Message missing disliked emoji');

    const res3 = await ALL_TOOLS.set_product_preference.execute({
      accountId: 'ethan',
      ingredientId: 'poulet_poitrine',
      status: 'neutral',
    });
    assert(res3.status === 'neutral', 'Status mismatch');
  });

  // Test update_catalog_item_price
  await record('Tool update_catalog_item_price', 'updates custom price, rejects negative price, resets to null', async () => {
    const res = await ALL_TOOLS.update_catalog_item_price.execute({
      ingredientId: 'poulet_poitrine',
      customPrice: 12.99,
    });
    assert(res.newPrice === 12.99, 'Price not updated');

    let threw = false;
    try {
      await ALL_TOOLS.update_catalog_item_price.execute({
        ingredientId: 'poulet_poitrine',
        customPrice: -4.50,
      });
    } catch (e: any) {
      threw = true;
      assert(e.message.includes('supérieur ou égal à 0'), `Unexpected error: ${e.message}`);
    }
    assert(threw, 'Did not reject negative price');

    const resReset = await ALL_TOOLS.update_catalog_item_price.execute({
      ingredientId: 'poulet_poitrine',
      customPrice: null,
    });
    assert(resReset.message.includes('rétabli au tarif officiel'), 'Reset message missing');
  });

  // Test get_daily_plan
  await record('Tool get_daily_plan', 'retrieves daily plan for single day and whole week', async () => {
    const singleDay = await ALL_TOOLS.get_daily_plan.execute({
      accountId: 'ethan',
      day: 'Wednesday',
    });
    assert(singleDay.message.includes('Mercredi'), 'Single day plan missing day name');

    const weekly = await ALL_TOOLS.get_daily_plan.execute({
      accountId: 'ethan',
    });
    assert(weekly.message.toLowerCase().includes('semaine'), 'Weekly plan missing week title');
    assert(weekly.weeklyPlan !== undefined, 'weeklyPlan array missing');
  });

  // Test get_macro_status
  await record('Tool get_macro_status', 'retrieves macro targets for ethan and laurine', async () => {
    const ethan = await ALL_TOOLS.get_macro_status.execute({ accountId: 'ethan' });
    assert(ethan.message.toLowerCase().includes('ethan'), 'Ethan missing');
    assert(typeof ethan.targets.calories === 'string' && ethan.targets.calories.includes('kcal'), 'Ethan calories format');

    const laurine = await ALL_TOOLS.get_macro_status.execute({ accountId: 'laurine' });
    assert(laurine.message.toLowerCase().includes('laurine'), 'Laurine missing');
  });

  // Test get_grocery_list
  await record('Tool get_grocery_list', 'generates grocery list for common, ethan, and laurine', async () => {
    const common = await ALL_TOOLS.get_grocery_list.execute({ scope: 'common' });
    assert(common.message.includes('épicerie') || common.message.includes('Épicerie'), 'Grocery list message missing header');
    assert(common.itemCount >= 0, 'Item count invalid');

    const ethan = await ALL_TOOLS.get_grocery_list.execute({ scope: 'ethan' });
    assert(ethan.scope === 'ethan', 'Scope mismatch');
  });

  // Test add_to_grocery_list
  await record('Tool add_to_grocery_list', 'adds custom item to grocery list with aisle resolution', async () => {
    const res = await ALL_TOOLS.add_to_grocery_list.execute({
      name: 'Savon à vaisselle',
      amount: 1,
      unit: 'bouteille',
      aisle: 'divers',
    });
    assert(res.message.includes('Savon à vaisselle'), 'Message missing item name');
    assert(res.item.aisle === 'DIVERS', `Expected DIVERS, got ${res.item.aisle}`);
  });

  // Test get_pantry_items & toggle_pantry_item
  await record('Tool pantry', 'toggles item in pantry and lists stock', async () => {
    await ALL_TOOLS.toggle_pantry_item.execute({
      ingredientId: 'riz_basmati',
      inStock: true,
    });
    const pantry = await (ALL_TOOLS.get_pantry_items.execute as any)();
    assert(pantry.items.some((name: string) => name.toLowerCase().includes('riz')), 'Pantry missing riz');

    await ALL_TOOLS.toggle_pantry_item.execute({
      ingredientId: 'riz_basmati',
      inStock: false,
    });
    const pantryAfter = await (ALL_TOOLS.get_pantry_items.execute as any)();
    assert(!pantryAfter.items.some((name: string) => name.toLowerCase().includes('riz basmati')), 'Pantry still contains riz');
  });

  // Test search_recipes
  await record('Tool search_recipes', 'searches recipes by keyword, mealType, and tag', async () => {
    // Seed a recipe first in isolated DB
    saveCustomRecipe({
      title: 'Poulet rôti aux herbes',
      mealType: 'souper',
      tags: ['volaille', 'facile'],
      caloriesPerServing: 450,
      proteinPerServing: 42,
    });

    const res = await ALL_TOOLS.search_recipes.execute({ query: 'poulet' });
    assert(res.count > 0, 'No recipes found for poulet');

    const resType = await ALL_TOOLS.search_recipes.execute({ mealType: 'souper' });
    assert(resType.count > 0, 'No souper recipes found');
    assert(resType.recipes.some((r: any) => r.title.includes('Poulet')), 'Poulet recipe not returned for souper');
  });

  // ==========================================
  // CLEANUP & ISOLATION TEARDOWN
  // ==========================================
  console.log('\n[Teardown] Closing isolated database...');
  resetDatabaseInstance();

  await record('Isolation', 'Temp DB file lock is released and file can be unlinked on Windows', () => {
    assert(fs.existsSync(tempDbPath), 'Temp file vanished unexpectedly');
    fs.unlinkSync(tempDbPath);
    assert(!fs.existsSync(tempDbPath), 'Temp file still exists after unlinkSync');
  });

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n=== TEST RESULTS SUMMARY ===');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.log('\nFAILED TESTS:');
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`❌ [${r.category}] ${r.name}: ${r.error}`);
    }
  }

  return { passedCount, failedCount, total: results.length, results };
}

runAllTests().catch((err) => {
  console.error('Fatal harness error:', err);
  process.exit(1);
});
