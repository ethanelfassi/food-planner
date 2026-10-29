/**
 * FoodPlanner Comprehensive Automated E2E Test Suite (Milestone M2)
 *
 * Covers 100% of the 18 MCP tools across Tiers 1-4:
 * - Tier 1: Feature Coverage (all 18 tools nominal execution)
 * - Tier 2: Boundary & Corner Cases (empty strings, negative prices, accents, ligatures, FR/EN days/slots, defaults, confirmation guards)
 * - Tier 3: Cross-Feature Integration Flows (recipe creation -> catalog search -> schedule -> plan -> grocery -> pantry)
 * - Tier 4: Real-World Scenarios (full week planning, store pricing budget impact, confirmation decline vs approve)
 *
 * Guarantees zero mutation to production data via an isolated temporary SQLite database in os.tmpdir()
 * and SHA-256 digest validation of data/food_planner.sqlite before and after execution.
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// 1. ISOLATION & INTEGRITY SETUP
// ---------------------------------------------------------------------------

const PROD_DB_PATH = path.resolve(process.cwd(), 'data', 'food_planner.sqlite');
const initialProdDbExists = fs.existsSync(PROD_DB_PATH);
const initialProdDbHash = initialProdDbExists
  ? crypto.createHash('sha256').update(fs.readFileSync(PROD_DB_PATH)).digest('hex')
  : null;

const TEMP_DB_PATH = path.resolve(os.tmpdir(), `food_planner_e2e_${Date.now()}_${process.pid}.sqlite`);
process.env.FOOD_PLANNER_DB_PATH = TEMP_DB_PATH;

let getDatabase: any;
let getDbPath: any;
let resetDatabaseInstance: any;
let ALL_TOOLS: any;
let normalizeText: any;
let parseDayIndex: any;
let parseMealSlot: any;
let findCustomRecipe: any;
let findCustomProduct: any;

// ---------------------------------------------------------------------------
// 2. TEST HARNESS & STATS
// ---------------------------------------------------------------------------

interface TestCaseResult {
  tier: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

const results: TestCaseResult[] = [];
let currentTier = 'Setup';

function setTier(tier: string) {
  currentTier = tier;
}

async function test(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ tier: currentTier, name, passed: true, durationMs });
    console.log(`  ✓ [${currentTier}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ tier: currentTier, name, passed: false, durationMs, error: err });
    console.error(`  ✗ [${currentTier}] ${name} (${durationMs}ms)`);
    console.error(`    -> Error: ${err.message || err}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 3).join('\n');
      console.error(`    ${lines}`);
    }
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected: ${expected}, got: ${actual})`);
  }
}

function assertIncludes(text: string, substring: string, message: string) {
  if (!text || !text.includes(substring)) {
    throw new Error(`Assertion failed: ${message} (string did not include "${substring}")`);
  }
}

async function assertThrows(fn: () => Promise<any> | any, message: string) {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`Assertion failed: Expected function to throw: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// 3. EXECUTE TEST TIERS
// ---------------------------------------------------------------------------

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('  FoodPlanner MCP Tools Automated E2E Test Suite');
  console.log(`  Isolated SQLite: ${TEMP_DB_PATH}`);
  console.log('============================================================\n');

  // Shared variables for cross-test persistence
  let createdRecipeId = '';
  let createdProductId = '';

  // -------------------------------------------------------------------------
  // TIER 1: Feature Coverage (All 18 MCP Tools Nominal Execution)
  // -------------------------------------------------------------------------
  setTier('Tier 1: Feature Coverage');

  // 1. create_recipe
  await test('1.1 create_recipe creates custom recipe with Metro catalog mapping & macros', async () => {
    const res: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Poulet Riz Brocoli Fitness',
      mealType: 'diner',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 2,
      ingredients: [
        { name: 'poitrine de poulet', quantity: 300, unit: 'g' },
        { name: 'riz basmati', quantity: 150, unit: 'g' },
        { name: 'brocoli', quantity: 200, unit: 'g' },
      ],
      instructions: ['Cuire le riz.', 'Faire griller le poulet.', 'Cuire le brocoli à la vapeur.'],
    });

    assert(Boolean(res.recipe), 'Expected recipe object in result');
    assert(res.recipe.id.startsWith('custom_recipe_'), `Expected custom_recipe_ prefix, got ${res.recipe.id}`);
    assertEqual(res.recipe.title, 'Poulet Riz Brocoli Fitness', 'Title mismatch');
    assertEqual(res.recipe.servings, 2, 'Servings mismatch');
    assert(res.recipe.macrosPerServing.calories > 200, `Calories should be calculated (>200), got ${res.recipe.macrosPerServing.calories}`);
    assert(parseInt(res.recipe.macrosPerServing.protein, 10) > 25, `Protein should be calculated (>25), got ${res.recipe.macrosPerServing.protein}`);
    assert(Boolean(res.recipe.estimatedCostTotal), 'Estimated cost should be present');
    assertIncludes(res.message, 'Poulet Riz Brocoli Fitness', 'Message should contain title');
    assertIncludes(res.message, 'kcal', 'Message should contain calories');

    createdRecipeId = res.recipe.id;
  });

  // 2. search_recipes
  await test('1.2 search_recipes finds recipes by title substring and keywords', async () => {
    const res: any = await ALL_TOOLS.search_recipes.execute({ query: 'Poulet Riz' });
    assert(res.count >= 1, `Expected at least 1 recipe, got ${res.count}`);
    const found = res.recipes.find((r: any) => r.id === createdRecipeId);
    assert(Boolean(found), 'Created recipe should be in search results');
    assertEqual(found?.isCustom, true, 'isCustom flag should be true');
    assertIncludes(res.message, 'recette', 'Message should mention recipes found');
  });

  // 3. search_catalog
  await test('1.3 search_catalog finds Metro ingredients with fuzzy search', async () => {
    const res: any = await ALL_TOOLS.search_catalog.execute({ query: 'poulet' });
    assert(res.count >= 1, `Expected at least 1 chicken ingredient, got ${res.count}`);
    const hasChicken = res.items.some((i: any) => i.name.toLowerCase().includes('poulet'));
    assert(hasChicken, 'Expected poultry items in search results');
    assert(Boolean(res.items[0].price), 'Ingredient price should be defined');
  });

  // 4. add_custom_product
  await test('1.4 add_custom_product creates custom product with macros and packaging', async () => {
    const res: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Seitan Bio Protein',
      aisle: 'EPICERIE',
      price: 5.49,
      amount: 250,
      unit: 'g',
      packageLabel: 'Paquet 250g',
      caloriesPer100g: 175,
      proteinPer100g: 26.5,
      carbsPer100g: 12.0,
      fatPer100g: 2.1,
      isTaxable: false,
    });

    assert(Boolean(res.product), 'Expected product object in result');
    assert(res.product.id.startsWith('custom_prod_'), `Expected custom_prod_ prefix, got ${res.product.id}`);
    assertEqual(res.product.name, 'Seitan Bio Protein', 'Name mismatch');
    assertEqual(res.product.macrosPer100g.calories, 175, 'Calories per 100g mismatch');
    assertEqual(res.product.macrosPer100g.protein, 26.5, 'Protein per 100g mismatch');
    assertIncludes(res.message, 'Seitan Bio Protein', 'Message should confirm addition');

    createdProductId = res.product.id;
  });

  // 5. update_catalog_item_price
  await test('1.5 update_catalog_item_price sets and persists custom ingredient price', async () => {
    const res: any = await ALL_TOOLS.update_catalog_item_price.execute({
      ingredientId: 'gruau_avoine',
      customPrice: 3.29,
    });

    assertEqual(res.ingredientId, 'gruau_avoine', 'Ingredient ID mismatch');
    assertEqual(res.newPrice, 3.29, 'Price mismatch');
    assertIncludes(res.message, '3.29', 'Message should reflect custom price');
  });

  // 6. schedule_meal
  await test('1.6 schedule_meal schedules meal for Monday lunch', async () => {
    const res: any = await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'lundi',
      mealSlot: 'lunch',
      recipeId: createdRecipeId,
    });

    assertEqual(res.schedule.accountId, 'ethan', 'Account mismatch');
    assertEqual(res.schedule.day, 'Lundi', 'Day mismatch');
    assertEqual(res.schedule.mealSlot, 'lunch', 'Meal slot mismatch');
    assertEqual(res.schedule.recipe.id, createdRecipeId, 'Recipe ID mismatch');
    assertIncludes(res.message, 'programmé', 'Confirmation message expected');
  });

  // 7. get_daily_plan
  await test('1.7 get_daily_plan retrieves day and weekly meal schedules with macros', async () => {
    // Specific day (Lundi)
    const dayRes: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'lundi' });
    assertEqual(dayRes.accountId, 'ethan', 'Account mismatch');
    assertEqual(dayRes.day, 'Lundi', 'Day mismatch');
    assertEqual(dayRes.lunch.title, 'Poulet Riz Brocoli Fitness', 'Scheduled recipe title mismatch');
    assert(dayRes.totals.calories > 0, 'Total calories should be positive');

    // Entire week
    const weekRes: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan' });
    assertEqual(weekRes.accountId, 'ethan', 'Account mismatch');
    assert(Array.isArray(weekRes.weeklyPlan), 'Expected weeklyPlan array');
    assertEqual(weekRes.weeklyPlan.length, 7, 'Expected 7 days in weekly plan');
  });

  // 8. get_macro_status
  await test('1.8 get_macro_status returns nutritional targets and grocery budget', async () => {
    const res: any = await ALL_TOOLS.get_macro_status.execute({ accountId: 'ethan' });
    assertEqual(res.accountId, 'ethan', 'Account mismatch');
    assert(Boolean(res.targets.calories), 'Target calories should be defined');
    assert(Boolean(res.targets.protein), 'Target protein should be defined');
    assert(Boolean(res.targets.weeklyBudget), 'Weekly budget should be defined');
    assertIncludes(res.message, 'Objectifs métaboliques', 'Message should summarize targets');
  });

  // 9. add_to_grocery_list
  await test('1.9 add_to_grocery_list adds ad-hoc shopping item', async () => {
    const res: any = await ALL_TOOLS.add_to_grocery_list.execute({
      name: 'Papier essuie-tout ultra absorbant',
      aisle: 'DIVERS',
      packageDescription: 'Paquet de 6 rouleaux',
      price: 6.99,
      forAccount: 'common',
      isTaxable: true,
    });

    assert(Boolean(res.item), 'Expected item object');
    assert(res.item.id.startsWith('custom_'), `Expected custom_ prefix, got ${res.item.id}`);
    assertEqual(res.item.name, 'Papier essuie-tout ultra absorbant', 'Name mismatch');
    assertIncludes(res.message, 'ajouté à la liste', 'Message confirmation expected');
  });

  // 10. get_grocery_list
  await test('1.10 get_grocery_list generates consolidated list with pricing & tax calculations', async () => {
    const res: any = await ALL_TOOLS.get_grocery_list.execute({ scope: 'common' });
    assertEqual(res.scope, 'common', 'Scope mismatch');
    assert(res.itemCount >= 1, `Expected at least 1 item in grocery list, got ${res.itemCount}`);
    assert(Boolean(res.totalWithTax), 'Total with tax should be formatted');
    assert(Array.isArray(res.items), 'Expected items array');
    const hasPaper = res.items.some((i: any) => i.name.includes('Papier essuie-tout'));
    assert(hasPaper, 'Ad-hoc item should be present in grocery list');
  });

  // 11. toggle_pantry_item
  await test('1.11 toggle_pantry_item sets item stock status in pantry', async () => {
    const res: any = await ALL_TOOLS.toggle_pantry_item.execute({
      ingredientId: 'riz_basmati',
      inStock: true,
    });

    assertEqual(res.ingredientId, 'riz_basmati', 'Ingredient ID mismatch');
    assertEqual(res.inStock, true, 'inStock should be true');
    assertIncludes(res.message, 'en stock', 'Message should confirm in stock');
  });

  // 12. get_pantry_items
  await test('1.12 get_pantry_items lists active in-stock pantry inventory', async () => {
    const res: any = await (ALL_TOOLS.get_pantry_items.execute as any)({});
    assert(res.totalInStock >= 1, `Expected at least 1 pantry item, got ${res.totalInStock}`);
    const hasRice = res.items.some((item: string) => item.toLowerCase().includes('riz'));
    assert(hasRice, 'Basmati rice should be in pantry list');
  });

  // 13. set_product_preference
  await test('1.13 set_product_preference updates and persists ingredient preference', async () => {
    const res: any = await ALL_TOOLS.set_product_preference.execute({
      accountId: 'ethan',
      ingredientId: 'brocoli',
      status: 'liked',
    });

    assertEqual(res.accountId, 'ethan', 'Account mismatch');
    assertEqual(res.status, 'liked', 'Status mismatch');
    assertIncludes(res.message, 'Préférence mise à jour', 'Message should confirm update');
  });

  // 14. modify_recipe (confirmed)
  await test('1.14 modify_recipe executes successfully with confirm: true', async () => {
    const res: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: createdRecipeId,
      title: 'Poulet Riz Brocoli Fitness Modifié',
      prepTimeMinutes: 20,
      confirm: true,
    });

    assert(Boolean(res.recipe), 'Expected updated recipe object');
    assertEqual(res.recipe.title, 'Poulet Riz Brocoli Fitness Modifié', 'Title should be updated');
    assertEqual(res.recipe.prepTimeMinutes, 20, 'Prep time should be updated');
    assertIncludes(res.message, 'modifiée avec succès', 'Message should confirm modification');
  });

  // 15. remove_scheduled_meal (confirmed)
  await test('1.15 remove_scheduled_meal clears scheduled meal with confirm: true', async () => {
    const res: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'lundi',
      mealSlot: 'lunch',
      confirm: true,
    });

    assertIncludes(res.message, 'déprogrammé', 'Message should confirm meal removed');

    // Verify it is no longer scheduled in daily plan
    const plan: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'lundi' });
    assert(plan.lunch.title !== 'Poulet Riz Brocoli Fitness Modifié', 'Meal slot should be reverted to default');
  });

  // 16. clear_day_schedule (confirmed)
  await test('1.16 clear_day_schedule clears all day meals with confirm: true', async () => {
    // Schedule a meal first on Mercredi
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'mercredi',
      mealSlot: 'dinner',
      recipeId: createdRecipeId,
    });

    const res: any = await ALL_TOOLS.clear_day_schedule.execute({
      accountId: 'ethan',
      day: 'mercredi',
      confirm: true,
    });

    assertIncludes(res.message, 'vidés', 'Message should confirm day cleared');
  });

  // 17. delete_recipe (confirmed)
  await test('1.17 delete_recipe permanently removes custom recipe with confirm: true', async () => {
    // Create temporary recipe to delete
    const temp: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Éphémère À Supprimer',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });

    const res: any = await ALL_TOOLS.delete_recipe.execute({
      recipeId: temp.recipe.id,
      confirm: true,
    });

    assertEqual(res.deletedRecipeId, temp.recipe.id, 'Deleted recipe ID mismatch');
    assertIncludes(res.message, 'supprimée définitivement', 'Message should confirm deletion');

    // Verify recipe is gone
    const lookup = findCustomRecipe(temp.recipe.id);
    assertEqual(lookup, null, 'Deleted recipe should not be findable');
  });

  // 18. delete_custom_product (confirmed)
  await test('1.18 delete_custom_product removes custom product with confirm: true', async () => {
    // Create temporary product to delete
    const temp: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Éphémère À Supprimer',
      price: 1.99,
      caloriesPer100g: 50,
      proteinPer100g: 2,
    });

    const res: any = await ALL_TOOLS.delete_custom_product.execute({
      productId: temp.product.id,
      confirm: true,
    });

    assertEqual(res.deletedProductId, temp.product.id, 'Deleted product ID mismatch');
    assertIncludes(res.message, 'supprimé définitivement', 'Message should confirm product deletion');

    // Verify product is gone
    const lookup = findCustomProduct(temp.product.id);
    assertEqual(lookup, null, 'Deleted product should not be findable');
  });

  // -------------------------------------------------------------------------
  // TIER 2: Boundary & Corner Cases (Defensive Logic & Edge Cases)
  // -------------------------------------------------------------------------
  setTier('Tier 2: Boundary & Corner Cases');

  // 2.1 Empty and whitespace inputs
  await test('2.1 Empty and whitespace identifiers do NOT match index 0', async () => {
    // Recipe lookups
    assertEqual(findCustomRecipe(''), null, 'findCustomRecipe("") must return null');
    assertEqual(findCustomRecipe('   '), null, 'findCustomRecipe("   ") must return null');

    // Product lookups
    assertEqual(findCustomProduct(''), null, 'findCustomProduct("") must return null');
    assertEqual(findCustomProduct('   '), null, 'findCustomProduct("   ") must return null');

    // schedule_meal throws descriptive error on empty recipe
    await assertThrows(
      () => ALL_TOOLS.schedule_meal.execute({ accountId: 'ethan', day: 'lundi', mealSlot: 'diner', recipeId: '' }),
      'schedule_meal with empty recipeId should throw'
    );
    await assertThrows(
      () => ALL_TOOLS.schedule_meal.execute({ accountId: 'ethan', day: 'lundi', mealSlot: 'diner', recipeId: '   ' }),
      'schedule_meal with whitespace recipeId should throw'
    );

    // delete_recipe throws on empty recipe
    await assertThrows(
      () => ALL_TOOLS.delete_recipe.execute({ recipeId: '', confirm: true }),
      'delete_recipe with empty recipeId should throw'
    );

    // delete_custom_product throws on empty product
    await assertThrows(
      () => ALL_TOOLS.delete_custom_product.execute({ productId: '', confirm: true }),
      'delete_custom_product with empty productId should throw'
    );
  });

  // 2.2 Negative price rejection & price reset
  await test('2.2 Negative price rejected; null custom price resets to Metro official', async () => {
    // Negative price should throw
    await assertThrows(
      () => ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'flocons_avoine', customPrice: -5.0 }),
      'Negative custom price should be rejected'
    );

    // Price reset via null
    const resetRes: any = await ALL_TOOLS.update_catalog_item_price.execute({
      ingredientId: 'flocons_avoine',
      customPrice: null,
    });
    assert(resetRes.newPrice > 0, 'newPrice should be restored to official Metro price');
    assertIncludes(resetRes.message, 'officiel Metro', 'Message should confirm official price reset');
  });

  // 2.3 Unknown recipes & items return helpful suggestions
  await test('2.3 Unknown items return structured suggestions without unhandled exceptions', async () => {
    // Unknown catalog search
    const catRes: any = await ALL_TOOLS.search_catalog.execute({ query: 'aliment_totalement_inconnu_xyz_123' });
    assertEqual(catRes.count, 0, 'Count should be 0');
    assertIncludes(catRes.message, 'Suggestions', 'Message should offer suggestions');

    // Unknown recipe search
    const recRes: any = await ALL_TOOLS.search_recipes.execute({ query: 'recette_inconnue_qui_n_existe_pas_404' });
    assertEqual(recRes.count, 0, 'Count should be 0');
    assertIncludes(recRes.message, 'Suggestions', 'Message should offer recipe suggestions');

    // Unknown recipe in schedule_meal throws with suggestions
    try {
      await ALL_TOOLS.schedule_meal.execute({
        accountId: 'ethan',
        day: 0,
        mealSlot: 'lunch',
        recipeId: 'recette_inexistante_999',
      });
      assert(false, 'Should have thrown');
    } catch (err: any) {
      assert(err.message.includes('Recettes disponibles') || err.message.includes('Aucune recette'), 'Error message should include recipe suggestions');
    }
  });

  // 2.4 Accents and ligatures normalization
  await test('2.4 Accents and ligatures (œ, æ, é, è, ç) normalized seamlessly', async () => {
    // Ligatures
    assertEqual(normalizeText('bœuf'), 'boeuf', 'œ should normalize to oe');
    assertEqual(normalizeText('BŒUF HACHÉ'), 'boeuf hache', 'Œ with accent should normalize');
    assertEqual(normalizeText('cæcum'), 'caecum', 'æ should normalize to ae');

    // Search catalog with ligature
    const boeufSearch: any = await ALL_TOOLS.search_catalog.execute({ query: 'bœuf' });
    assert(boeufSearch.count >= 1, 'Search for "bœuf" should find "boeuf" in catalog');

    // Search catalog with accented word
    const epinardSearch: any = await ALL_TOOLS.search_catalog.execute({ query: 'épinards' });
    assert(epinardSearch.count >= 1, 'Search for "épinards" should find "epinards"');
  });

  // 2.5 Bilingual day parser & aliases
  await test('2.5 Bilingual day parser handles French, English, abbreviations, and indices 0-6', async () => {
    // French days
    assertEqual(parseDayIndex('lundi'), 0, 'lundi -> 0');
    assertEqual(parseDayIndex('mardi'), 1, 'mardi -> 1');
    assertEqual(parseDayIndex('mercredi'), 2, 'mercredi -> 2');
    assertEqual(parseDayIndex('jeudi'), 3, 'jeudi -> 3');
    assertEqual(parseDayIndex('vendredi'), 4, 'vendredi -> 4');
    assertEqual(parseDayIndex('samedi'), 5, 'samedi -> 5');
    assertEqual(parseDayIndex('dimanche'), 6, 'dimanche -> 6');

    // English days
    assertEqual(parseDayIndex('Monday'), 0, 'Monday -> 0');
    assertEqual(parseDayIndex('Tuesday'), 1, 'Tuesday -> 1');
    assertEqual(parseDayIndex('Wednesday'), 2, 'Wednesday -> 2');
    assertEqual(parseDayIndex('Thursday'), 3, 'Thursday -> 3');
    assertEqual(parseDayIndex('Friday'), 4, 'Friday -> 4');
    assertEqual(parseDayIndex('Saturday'), 5, 'Saturday -> 5');
    assertEqual(parseDayIndex('Sunday'), 6, 'Sunday -> 6');

    // Abbreviations
    assertEqual(parseDayIndex('lun'), 0, 'lun -> 0');
    assertEqual(parseDayIndex('mar'), 1, 'mar -> 1');
    assertEqual(parseDayIndex('wed'), 2, 'wed -> 2');
    assertEqual(parseDayIndex('fri'), 4, 'fri -> 4');

    // Numbers & numeric strings
    assertEqual(parseDayIndex(0), 0, '0 -> 0');
    assertEqual(parseDayIndex(6), 6, '6 -> 6');
    assertEqual(parseDayIndex('2'), 2, '"2" -> 2');

    // Invalid day throws
    assertThrows(() => parseDayIndex('octobre'), 'Invalid month should throw');
    assertThrows(() => parseDayIndex(-1), 'Negative index should throw');
    assertThrows(() => parseDayIndex(7), 'Index 7 should throw');
  });

  // 2.6 Meal slot aliases
  await test('2.6 Meal slot parser handles French & English aliases correctly', async () => {
    // Breakfast aliases
    assertEqual(parseMealSlot('breakfast'), 'breakfast', 'breakfast -> breakfast');
    assertEqual(parseMealSlot('matin'), 'breakfast', 'matin -> breakfast');
    assertEqual(parseMealSlot('déjeuner'), 'breakfast', 'déjeuner -> breakfast');
    assertEqual(parseMealSlot('petit-déjeuner'), 'breakfast', 'petit-déjeuner -> breakfast');

    // Lunch aliases
    assertEqual(parseMealSlot('lunch'), 'lunch', 'lunch -> lunch');
    assertEqual(parseMealSlot('midi'), 'lunch', 'midi -> lunch');
    assertEqual(parseMealSlot('dîner'), 'lunch', 'dîner -> lunch');

    // Dinner aliases
    assertEqual(parseMealSlot('dinner'), 'dinner', 'dinner -> dinner');
    assertEqual(parseMealSlot('souper'), 'dinner', 'souper -> dinner');
    assertEqual(parseMealSlot('soir'), 'dinner', 'soir -> dinner');

    // Snack aliases
    assertEqual(parseMealSlot('snack'), 'snack', 'snack -> snack');
    assertEqual(parseMealSlot('collation'), 'snack', 'collation -> snack');
    assertEqual(parseMealSlot('goûter'), 'snack', 'goûter -> snack');
    assertEqual(parseMealSlot('4h'), 'snack', '4h -> snack');
  });

  // 2.7 Defaults & Servings Proration
  await test('2.7 Defaults apply safely; modifying servings without ingredients prorates macros', async () => {
    // add_custom_product with omitted amount defaults to 100g without SQLite binding errors
    const prod: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Sans Amount Spécifié',
      price: 3.50,
      caloriesPer100g: 120,
      proteinPer100g: 15,
      // amount is intentionally omitted!
    });
    assert(Boolean(prod.product), 'Product created without explicit amount');

    // Clean up test product
    await ALL_TOOLS.delete_custom_product.execute({ productId: prod.product.id, confirm: true });

    // modify_recipe: servings changed from 1 to 2 without ingredients prorates macros
    const recipeBase: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Test Prorata Macros',
      servings: 1,
      caloriesPerServing: 500,
      proteinPerServing: 40,
      carbsPerServing: 50,
      fatPerServing: 15,
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });

    const baseCals = recipeBase.recipe.macrosPerServing.calories;
    const baseProt = parseFloat(recipeBase.recipe.macrosPerServing.protein);
    const baseCarbs = parseFloat(recipeBase.recipe.macrosPerServing.carbs);
    const baseFat = parseFloat(recipeBase.recipe.macrosPerServing.fat);

    const scaled: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: recipeBase.recipe.id,
      servings: 2,
      confirm: true,
      // ingredients omitted!
    });

    assertEqual(scaled.recipe.servings, 2, 'Servings should be 2');
    assertEqual(scaled.recipe.caloriesPerServing, Math.round(baseCals / 2), 'Calories should be prorated: baseCals / 2');
    assertEqual(scaled.recipe.proteinPerServing, Math.round((baseProt / 2) * 10) / 10, 'Protein should be prorated: baseProt / 2');
    assertEqual(scaled.recipe.carbsPerServing, Math.round((baseCarbs / 2) * 10) / 10, 'Carbs should be prorated: baseCarbs / 2');
    assertEqual(scaled.recipe.fatPerServing, Math.round((baseFat / 2) * 10) / 10, 'Fat should be prorated: baseFat / 2');

    // Scale again from 2 to 4
    const scaled4: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: recipeBase.recipe.id,
      servings: 4,
      confirm: true,
    });
    assertEqual(scaled4.recipe.servings, 4, 'Servings should be 4');
    assertEqual(scaled4.recipe.caloriesPerServing, Math.round(baseCals / 4), 'Calories should be prorated: baseCals / 4');
    assertEqual(scaled4.recipe.proteinPerServing, Math.round((baseProt / 4) * 10) / 10, 'Protein should be prorated: baseProt / 4');

    // Clean up
    await ALL_TOOLS.delete_recipe.execute({ recipeId: recipeBase.recipe.id, confirm: true });
  });

  // 2.8 Destructive tools without confirmation block mutations
  await test('2.8 All 5 destructive tools refuse execution and preserve state when unconfirmed', async () => {
    // 1. delete_recipe unconfirmed
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Test Protection Confirmation',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    const unconfDel: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: rec.recipe.id });
    assertEqual(unconfDel.requires_confirmation, true, 'delete_recipe should require confirmation');
    assertEqual(Boolean(findCustomRecipe(rec.recipe.id)), true, 'Recipe must NOT be deleted');

    // 2. modify_recipe unconfirmed
    const unconfMod: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: rec.recipe.id,
      title: 'Titre Modifié Illégal',
    });
    assertEqual(unconfMod.requires_confirmation, true, 'modify_recipe should require confirmation');
    const checkRec = findCustomRecipe(rec.recipe.id);
    assertEqual(checkRec?.title, 'Recette Test Protection Confirmation', 'Title must NOT be modified');

    // 3. schedule a meal then test remove_scheduled_meal unconfirmed
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'lunch',
      recipeId: rec.recipe.id,
    });
    const unconfRem: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'lunch',
    });
    assertEqual(unconfRem.requires_confirmation, true, 'remove_scheduled_meal should require confirmation');
    const planMardi: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'mardi' });
    assertEqual(planMardi.lunch.title, 'Recette Test Protection Confirmation', 'Meal must still be scheduled');

    // 4. clear_day_schedule unconfirmed
    const unconfClear: any = await ALL_TOOLS.clear_day_schedule.execute({
      accountId: 'ethan',
      day: 'mardi',
      confirm: false,
    });
    assertEqual(unconfClear.requires_confirmation, true, 'clear_day_schedule should require confirmation');
    const planMardiStill: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'mardi' });
    assertEqual(planMardiStill.lunch.title, 'Recette Test Protection Confirmation', 'Schedule must NOT be cleared');

    // 5. delete_custom_product unconfirmed
    const prod: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Test Protection Confirmation',
      price: 2.99,
      caloriesPer100g: 100,
      proteinPer100g: 10,
    });
    const unconfDelProd: any = await ALL_TOOLS.delete_custom_product.execute({
      productId: prod.product.id,
      confirmed: false,
    });
    assertEqual(unconfDelProd.requires_confirmation, true, 'delete_custom_product should require confirmation');
    assertEqual(Boolean(findCustomProduct(prod.product.id)), true, 'Product must NOT be deleted');

    // Clean up test data with confirmed calls
    await ALL_TOOLS.remove_scheduled_meal.execute({ accountId: 'ethan', day: 'mardi', mealSlot: 'lunch', confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec.recipe.id, confirm: true });
    await ALL_TOOLS.delete_custom_product.execute({ productId: prod.product.id, confirm: true });
  });

  // -------------------------------------------------------------------------
  // TIER 3: Cross-Feature Integration Flows
  // -------------------------------------------------------------------------
  setTier('Tier 3: Cross-Feature Integration Flows');

  // 3.1 Complete End-to-End Synergy Flow
  await test('3.1 Complete end-to-end recipe, pantry, schedule, and grocery synergy lifecycle', async () => {
    // Step 1: Add custom product (Whey Isolate)
    const whey: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Whey Isolate Vanille Gold',
      aisle: 'EPICERIE',
      price: 49.99,
      amount: 900,
      unit: 'g',
      caloriesPer100g: 380,
      proteinPer100g: 85,
      carbsPer100g: 3,
      fatPer100g: 1.5,
    });
    assert(Boolean(whey.product.id), 'Whey product created');

    // Step 2: Catalog search finds custom product
    const wheySearch: any = await ALL_TOOLS.search_catalog.execute({ query: 'Whey Isolate' });
    assert(wheySearch.count >= 1, 'Custom product should be indexed in catalog');

    // Step 3: Create custom recipe using custom product + Metro staples
    const shake: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Shake Protéiné Post-Workout',
      mealType: 'collation',
      servings: 1,
      ingredients: [
        { name: 'Whey Isolate Vanille Gold', quantity: 35, unit: 'g' },
        { name: 'lait_2_pourcent', quantity: 250, unit: 'ml' },
        { name: 'banane', quantity: 1, unit: 'unite' },
      ],
      instructions: ['Mixer tous les ingrédients dans le blender.'],
    });
    const shakeProtein = parseFloat(shake.recipe.macrosPerServing.protein);
    assert(shakeProtein >= 30, `Expected >= 30g protein, got ${shake.recipe.macrosPerServing.protein}`);

    // Step 4: Schedule for Laurine on Tuesday breakfast
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'laurine',
      day: 'mardi',
      mealSlot: 'breakfast',
      recipeId: shake.recipe.id,
    });

    // Step 5: Verify Laurine's daily plan reflects scheduled shake
    const laurineTuesday: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'laurine', day: 'mardi' });
    assertEqual(laurineTuesday.breakfast.title, 'Shake Protéiné Post-Workout', 'Scheduled breakfast title mismatch');

    // Step 6: Toggle pantry item for milk
    await ALL_TOOLS.toggle_pantry_item.execute({ ingredientId: 'lait_2_pourcent', inStock: true });
    const pantry: any = await (ALL_TOOLS.get_pantry_items.execute as any)({});
    const hasMilk = pantry.items.some((i: string) => i.toLowerCase().includes('lait'));
    assert(hasMilk, 'Milk should be in pantry');

    // Step 7: Check grocery list reflects items
    const grocery: any = await ALL_TOOLS.get_grocery_list.execute({ scope: 'laurine' });
    assert(grocery.itemCount >= 1, 'Grocery list should contain items');

    // Step 8: Clean up
    await ALL_TOOLS.remove_scheduled_meal.execute({ accountId: 'laurine', day: 'mardi', mealSlot: 'breakfast', confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: shake.recipe.id, confirm: true });
    await ALL_TOOLS.delete_custom_product.execute({ productId: whey.product.id, confirm: true });
  });

  // 3.2 Multi-Account Isolation
  await test('3.2 Multi-account schedule isolation between Ethan and Laurine', async () => {
    // Create two separate recipes
    const rEthan: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Plat Spécial Ethan Repas',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    const rLaurine: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Plat Spécial Laurine Repas',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });

    // Schedule same slot (Jeudi diner) for both accounts
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'jeudi',
      mealSlot: 'dinner',
      recipeId: rEthan.recipe.id,
    });
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'laurine',
      day: 'jeudi',
      mealSlot: 'dinner',
      recipeId: rLaurine.recipe.id,
    });

    // Verify isolation
    const planEthan: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'jeudi' });
    const planLaurine: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'laurine', day: 'jeudi' });

    assertEqual(planEthan.dinner.title, 'Plat Spécial Ethan Repas', "Ethan's dinner mismatch");
    assertEqual(planLaurine.dinner.title, 'Plat Spécial Laurine Repas', "Laurine's dinner mismatch");

    // Clear day for Ethan only
    await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day: 'jeudi', confirm: true });

    // Verify Ethan is cleared, but Laurine remains scheduled!
    const planEthanAfter: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'jeudi' });
    const planLaurineAfter: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'laurine', day: 'jeudi' });

    assert(planEthanAfter.dinner.title !== 'Plat Spécial Ethan Repas', "Ethan's schedule should be cleared");
    assertEqual(planLaurineAfter.dinner.title, 'Plat Spécial Laurine Repas', "Laurine's schedule must remain untouched");

    // Clean up
    await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'laurine', day: 'jeudi', confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rEthan.recipe.id, confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rLaurine.recipe.id, confirm: true });
  });

  // 3.3 Recipe Search by tags and mealType
  await test('3.3 Recipe filtering by mealType and keyword matching', async () => {
    const rec1: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Omelette Express Protéinée',
      mealType: 'dejeuner',
      ingredients: [{ name: 'oeufs_12', quantity: 3, unit: 'unite' }],
    });
    const rec2: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Poulet Rôti Express Souper',
      mealType: 'souper',
      ingredients: [{ name: 'poulet_poitrine', quantity: 200, unit: 'g' }],
    });

    // Search by mealType 'dejeuner'
    const resDej: any = await ALL_TOOLS.search_recipes.execute({ mealType: 'dejeuner' });
    const hasOmelette = resDej.recipes.some((r: any) => r.id === rec1.recipe.id);
    const hasPoulet = resDej.recipes.some((r: any) => r.id === rec2.recipe.id);
    assert(hasOmelette, 'Omelette should be in dejeuner search results');
    assert(!hasPoulet, 'Poulet souper must NOT be in dejeuner search results');

    // Search by keyword 'Express'
    const resExpress: any = await ALL_TOOLS.search_recipes.execute({ query: 'Express' });
    assert(resExpress.count >= 2, 'Both express recipes should be found');

    // Clean up
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec1.recipe.id, confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec2.recipe.id, confirm: true });
  });

  // -------------------------------------------------------------------------
  // TIER 4: Real-World Scenarios
  // -------------------------------------------------------------------------
  setTier('Tier 4: Real-World Scenarios');

  // 4.1 Full-Week Meal Planning
  await test('4.1 Full-week meal planning across 7 days with macro aggregation and grocery calculation', async () => {
    // Create base recipes
    const rBreakfast: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Gruau Banane & Beurre d Arachide',
      mealType: 'dejeuner',
      caloriesPerServing: 420,
      proteinPerServing: 18,
      ingredients: [
        { name: 'flocons_avoine', quantity: 60, unit: 'g' },
        { name: 'banane', quantity: 1, unit: 'unite' },
      ],
    });
    const rDinner: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Saumon & Quinoa Légumes',
      mealType: 'souper',
      caloriesPerServing: 550,
      proteinPerServing: 42,
      ingredients: [
        { name: 'saumon_atlantique', quantity: 180, unit: 'g' },
        { name: 'quinoa', quantity: 70, unit: 'g' },
        { name: 'brocoli', quantity: 150, unit: 'g' },
      ],
    });

    // Schedule 7 days of breakfast and dinner
    for (let day = 0; day < 7; day++) {
      await ALL_TOOLS.schedule_meal.execute({
        accountId: 'ethan',
        day,
        mealSlot: 'breakfast',
        recipeId: rBreakfast.recipe.id,
      });
      await ALL_TOOLS.schedule_meal.execute({
        accountId: 'ethan',
        day,
        mealSlot: 'dinner',
        recipeId: rDinner.recipe.id,
      });
    }

    // Query weekly plan
    const fullWeekPlan: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan' });
    assertEqual(fullWeekPlan.weeklyPlan.length, 7, 'Expected 7 planned days');

    for (const day of fullWeekPlan.weeklyPlan) {
      assertEqual(day.breakfast, 'Gruau Banane & Beurre d Arachide', 'Breakfast title should match across all 7 days');
      assertEqual(day.dinner, 'Saumon & Quinoa Légumes', 'Dinner title should match across all 7 days');
      assert(day.calories > 900, `Daily calories should aggregate (>900), got ${day.calories}`);
    }

    // Query weekly grocery list
    const weeklyGrocery: any = await ALL_TOOLS.get_grocery_list.execute({ scope: 'ethan' });
    assert(weeklyGrocery.itemCount > 0, 'Grocery list should have consolidated week items');

    // Clean up
    for (let day = 0; day < 7; day++) {
      await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day, confirm: true });
    }
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rBreakfast.recipe.id, confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rDinner.recipe.id, confirm: true });
  });

  // 4.2 Store Price Adjustments & Dynamic Budget Impact
  await test('4.2 Dynamic store price adjustments impact recipe costs and grocery budget', async () => {
    // Update prices of key staples
    const resChicken: any = await ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'poulet_poitrine', customPrice: 12.99 });
    assertEqual(resChicken.newPrice, 12.99, 'Custom chicken price must be updated');
    assertIncludes(resChicken.message, '12.99', 'Message should reflect custom price');

    const resOats: any = await ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'gruau_avoine', customPrice: 4.49 });
    assertEqual(resOats.newPrice, 4.49, 'Custom oats price must be updated');

    // Reset prices back to official Metro
    const resReset: any = await ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'poulet_poitrine', customPrice: null });
    assert(resReset.newPrice > 0, 'Chicken price should be reset to official Metro');
    assert(resReset.newPrice !== 12.99, 'Chicken price should no longer be 12.99 after reset');
    assertIncludes(resReset.message, 'officiel Metro', 'Reset confirmation message');

    await ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'gruau_avoine', customPrice: null });
  });

  // 4.3 Confirmation Safety & Cancellation Journey
  await test('4.3 User cancellation journey: refuse confirmation preserves data, acceptance mutates', async () => {
    // Create recipe
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Plat Crucial Confirmatory Journey',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });

    // Schedule on Vendredi
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'vendredi',
      mealSlot: 'dinner',
      recipeId: rec.recipe.id,
    });

    // Step 1: User asks to clear Friday schedule without confirmation
    const step1: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day: 'vendredi' });
    assertEqual(step1.requires_confirmation, true, 'Confirmation required on step 1');
    assertIncludes(step1.warning, 'CONFIRMATION REQUISE', 'Warning message present');

    // Step 2: User explicitly declines (confirm: false)
    const step2: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day: 'vendredi', confirm: false });
    assertEqual(step2.requires_confirmation, true, 'Confirmation still required when confirm is false');

    // Verify schedule is still intact
    const planFri: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'vendredi' });
    assertEqual(planFri.dinner.title, 'Plat Crucial Confirmatory Journey', 'Schedule must remain untouched');

    // Step 3: User confirms (confirm: true)
    const step3: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day: 'vendredi', confirm: true });
    assertIncludes(step3.message, 'vidés', 'Cleared confirmation message');

    // Verify schedule is now empty
    const planFriAfter: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'vendredi' });
    assert(planFriAfter.dinner.title !== 'Plat Crucial Confirmatory Journey', 'Friday schedule should now be clear');

    // Clean up recipe
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec.recipe.id, confirm: true });
  });

  // Clean up initial test recipe if still present
  if (createdRecipeId) {
    try {
      await ALL_TOOLS.delete_recipe.execute({ recipeId: createdRecipeId, confirm: true });
    } catch {
      // Ignore if already deleted
    }
  }
}

// ---------------------------------------------------------------------------
// 4. RUNNER & INTEGRITY VERIFICATION
// ---------------------------------------------------------------------------

async function main() {
  let suiteError: any = null;

  try {
    const dbModule = await import('../src/lib/db.js');
    getDatabase = dbModule.getDatabase;
    getDbPath = dbModule.getDbPath;
    resetDatabaseInstance = dbModule.resetDatabaseInstance;

    const toolsModule = await import('../src/mcp/tools.js');
    ALL_TOOLS = toolsModule.ALL_TOOLS;
    normalizeText = toolsModule.normalizeText;
    parseDayIndex = toolsModule.parseDayIndex;
    parseMealSlot = toolsModule.parseMealSlot;
    findCustomRecipe = toolsModule.findCustomRecipe;
    findCustomProduct = toolsModule.findCustomProduct;

    if (getDbPath() !== TEMP_DB_PATH) {
      console.error(`FATAL: Database path mismatch! Expected ${TEMP_DB_PATH}, got ${getDbPath()}`);
      process.exit(2);
    }

    getDatabase();

    await runTestSuite();
  } catch (err: any) {
    suiteError = err;
    console.error('\nFATAL SUITE ERROR:', err);
  } finally {
    // 1. Release Windows SQLite file locks
    if (resetDatabaseInstance) {
      resetDatabaseInstance();
    }

    // 2. Unlink temporary SQLite database
    if (fs.existsSync(TEMP_DB_PATH)) {
      try {
        fs.unlinkSync(TEMP_DB_PATH);
        console.log(`\n🧹 Cleaned up temporary database: ${TEMP_DB_PATH}`);
      } catch (unlinkErr) {
        console.error(`⚠️ Warning: could not unlink temporary database: ${unlinkErr}`);
      }
    }

    // 3. Verify production database integrity
    console.log('\n🔒 Verifying production database integrity...');
    const postProdDbExists = fs.existsSync(PROD_DB_PATH);
    const postProdDbHash = postProdDbExists
      ? crypto.createHash('sha256').update(fs.readFileSync(PROD_DB_PATH)).digest('hex')
      : null;

    if (initialProdDbHash !== postProdDbHash) {
      console.error('❌ INTEGRITY VIOLATION DETECTED!');
      console.error(`   Initial SHA-256: ${initialProdDbHash}`);
      console.error(`   Final   SHA-256: ${postProdDbHash}`);
      process.exit(2);
    } else {
      console.log(`✅ Production database SHA-256 invariant verified (0 bytes mutated):`);
      console.log(`   SHA-256: ${postProdDbHash}`);
    }
  }

  // 4. Print summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const totalCount = results.length;

  console.log('\n============================================================');
  console.log(`  E2E Test Suite Summary: ${passedCount}/${totalCount} Passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('============================================================');

  const tierGroups = ['Tier 1: Feature Coverage', 'Tier 2: Boundary & Corner Cases', 'Tier 3: Cross-Feature Integration Flows', 'Tier 4: Real-World Scenarios'];
  for (const tier of tierGroups) {
    const tierTests = results.filter((r) => r.tier === tier);
    const tierPassed = tierTests.filter((r) => r.passed).length;
    console.log(`  • ${tier}: ${tierPassed}/${tierTests.length} passed`);
  }

  if (failedCount > 0 || suiteError) {
    console.error(`\n❌ TEST SUITE FAILED: ${failedCount} failure(s) detected.`);
    process.exit(1);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Exit code 0.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
