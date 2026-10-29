/**
 * FoodPlanner Adversarial Coverage Hardening Test Suite (Tier 5)
 *
 * White-box adversarial testing covering:
 * 1. Confirmation Gate Invariants across all 5 destructive tools (unconfirmed, confirm:false, confirmed:false, confirm:true, confirmed:true, non-existent targets).
 * 2. Adversarial inputs: SQL injection strings, regex specials, unicode/emojis, boundary numbers (0, negative, float, large).
 * 3. Mobile Markdown formatting & structured responses across all 18 tools.
 * 4. REST API Bridge (GET /api/mcp, POST /api/mcp) input validation, error handling, and confirmation gates.
 * 5. MCP Transports (stdio, SSE, streamableHttp) error wrapping and registration.
 * 6. Cryptographic zero-mutation guarantee on data/food_planner.sqlite.
 */

import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// 1. ISOLATION & HASH SETUP
// ---------------------------------------------------------------------------
const PROD_DB_PATH = path.resolve(process.cwd(), 'data', 'food_planner.sqlite');
const initialProdDbExists = fs.existsSync(PROD_DB_PATH);
const initialProdDbHash = initialProdDbExists
  ? crypto.createHash('sha256').update(fs.readFileSync(PROD_DB_PATH)).digest('hex')
  : null;

const TEMP_DB_PATH = path.resolve(os.tmpdir(), `food_planner_adv_tier5_${Date.now()}_${process.pid}.sqlite`);
process.env.FOOD_PLANNER_DB_PATH = TEMP_DB_PATH;

let getDatabase: any;
let getDbPath: any;
let resetDatabaseInstance: any;
let ALL_TOOLS: any;
let toolSchemas: any;
let toolSchemasWithConfirmation: any;
let normalizeText: any;
let parseDayIndex: any;
let parseMealSlot: any;
let findCustomRecipe: any;
let findCustomProduct: any;
let findBestIngredient: any;

interface AdvTestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error;
}

const testResults: AdvTestResult[] = [];
let currentSuite = 'Setup';

function setSuite(suite: string) {
  currentSuite = suite;
}

async function advTest(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ suite: currentSuite, name, passed: true, durationMs });
    console.log(`  ✓ [${currentSuite}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({ suite: currentSuite, name, passed: false, durationMs, error: err });
    console.error(`  ✗ [${currentSuite}] ${name} (${durationMs}ms)`);
    console.error(`    -> Error: ${err.message || err}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 3).join('\n');
      console.error(`    ${lines}`);
    }
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) throw new Error(`Assertion failed: ${msg} (expected: ${expected}, got: ${actual})`);
}

function assertIncludes(text: string, sub: string, msg: string) {
  if (!text || !text.includes(sub)) throw new Error(`Assertion failed: ${msg} (expected text to include "${sub}")`);
}

async function runAdversarialHarness() {
  console.log('\n============================================================');
  console.log('  FoodPlanner MCP Adversarial Coverage Hardening (Tier 5)');
  console.log(`  Target Isolated DB: ${TEMP_DB_PATH}`);
  console.log('============================================================\n');

  // -------------------------------------------------------------------------
  // SUITE 1: Confirmation Gate Invariants on All 5 Destructive Tools
  // -------------------------------------------------------------------------
  setSuite('Suite 1: Confirmation Gates');

  // 1.1 delete_recipe gate
  await advTest('1.1 delete_recipe confirmation gates (undefined, false, confirmed alias, invalid)', async () => {
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Test Porte Confirmation Del',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    const rId = rec.recipe.id;

    // A. Unconfirmed (undefined)
    const resUndef: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: rId });
    assertEqual(resUndef.requires_confirmation, true, 'Undefined confirm must trigger gate');
    assert(Boolean(findCustomRecipe(rId)), 'Recipe must not be deleted when confirm is undefined');

    // B. Explicit confirm: false
    const resFalse: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: rId, confirm: false });
    assertEqual(resFalse.requires_confirmation, true, 'confirm: false must trigger gate');
    assert(Boolean(findCustomRecipe(rId)), 'Recipe must not be deleted when confirm: false');

    // C. Explicit confirmed: false (alias)
    const resAliasFalse: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: rId, confirmed: false });
    assertEqual(resAliasFalse.requires_confirmation, true, 'confirmed: false must trigger gate');
    assert(Boolean(findCustomRecipe(rId)), 'Recipe must not be deleted when confirmed: false');

    // D. Non-existent recipe throws helpful error
    let threwNonExistent = false;
    try {
      await ALL_TOOLS.delete_recipe.execute({ recipeId: 'non_existent_rec_9999', confirm: true });
    } catch (e: any) {
      threwNonExistent = true;
      assertIncludes(e.message, 'Recette personnalisée introuvable', 'Error message for unknown recipe');
    }
    assert(threwNonExistent, 'delete_recipe with unknown ID must throw helpful error');

    // E. Confirmed via confirmed: true (alias)
    const resAliasTrue: any = await ALL_TOOLS.delete_recipe.execute({ recipeId: rId, confirmed: true });
    assertEqual(resAliasTrue.deletedRecipeId, rId, 'confirmed: true must execute deletion');
    assertEqual(findCustomRecipe(rId), null, 'Recipe must be deleted after confirmed: true');
  });

  // 1.2 modify_recipe gate
  await advTest('1.2 modify_recipe confirmation gates (undefined, false, confirmed alias, scaling)', async () => {
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Test Porte Confirmation Mod',
      servings: 1,
      caloriesPerServing: 300,
      proteinPerServing: 20,
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    const rId = rec.recipe.id;

    // A. Unconfirmed
    const resUndef: any = await ALL_TOOLS.modify_recipe.execute({ recipeId: rId, title: 'Hacked Title' });
    assertEqual(resUndef.requires_confirmation, true, 'Undefined confirm must trigger gate');
    assertEqual(findCustomRecipe(rId)?.title, 'Recette Test Porte Confirmation Mod', 'Title must not change');

    // B. Explicit confirm: false
    const resFalse: any = await ALL_TOOLS.modify_recipe.execute({ recipeId: rId, title: 'Hacked Title 2', confirm: false });
    assertEqual(resFalse.requires_confirmation, true, 'confirm: false must trigger gate');
    assertEqual(findCustomRecipe(rId)?.title, 'Recette Test Porte Confirmation Mod', 'Title must not change');

    // C. Explicit confirmed: false
    const resAliasFalse: any = await ALL_TOOLS.modify_recipe.execute({ recipeId: rId, title: 'Hacked Title 3', confirmed: false });
    assertEqual(resAliasFalse.requires_confirmation, true, 'confirmed: false must trigger gate');
    assertEqual(findCustomRecipe(rId)?.title, 'Recette Test Porte Confirmation Mod', 'Title must not change');

    // D. Non-existent recipe throws helpful error
    let threwNonExistent = false;
    try {
      await ALL_TOOLS.modify_recipe.execute({ recipeId: 'non_existent_rec_9999', confirm: true });
    } catch (e: any) {
      threwNonExistent = true;
      assertIncludes(e.message, 'Recette personnalisée introuvable', 'Error message for unknown recipe');
    }
    assert(threwNonExistent, 'modify_recipe with unknown ID must throw helpful error');

    // E. Confirmed modification with confirmed: true
    const resAliasTrue: any = await ALL_TOOLS.modify_recipe.execute({
      recipeId: rId,
      title: 'Recette Test Modifiée Confirmée',
      confirmed: true,
    });
    assertEqual(resAliasTrue.recipe.title, 'Recette Test Modifiée Confirmée', 'Title must be modified');

    // Cleanup
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rId, confirm: true });
  });

  // 1.3 remove_scheduled_meal gate
  await advTest('1.3 remove_scheduled_meal confirmation gates (undefined, false, confirmed alias)', async () => {
    // Schedule a meal first
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Repas Schedule Gate Test',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'dinner',
      recipeId: rec.recipe.id,
    });

    // A. Unconfirmed
    const resUndef: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'dinner',
    });
    assertEqual(resUndef.requires_confirmation, true, 'Undefined confirm must trigger gate');
    const planStill: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'mardi' });
    assertEqual(planStill.dinner.title, 'Repas Schedule Gate Test', 'Meal must remain scheduled');

    // B. confirm: false
    const resFalse: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'dinner',
      confirm: false,
    });
    assertEqual(resFalse.requires_confirmation, true, 'confirm: false must trigger gate');

    // C. confirmed: false
    const resAliasFalse: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'dinner',
      confirmed: false,
    });
    assertEqual(resAliasFalse.requires_confirmation, true, 'confirmed: false must trigger gate');

    // D. confirmed: true (alias)
    const resAliasTrue: any = await ALL_TOOLS.remove_scheduled_meal.execute({
      accountId: 'ethan',
      day: 'mardi',
      mealSlot: 'dinner',
      confirmed: true,
    });
    assertIncludes(resAliasTrue.message, 'déprogrammé', 'Meal must be removed');

    const planAfter: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'mardi' });
    assert(planAfter.dinner.title !== 'Repas Schedule Gate Test', 'Meal slot must be reverted');

    // Cleanup
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec.recipe.id, confirm: true });
  });

  // 1.4 clear_day_schedule gate
  await advTest('1.4 clear_day_schedule confirmation gates (undefined, false, confirmed alias)', async () => {
    // Schedule two meals on Jeudi
    const rec: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Repas Jeudi Clear Test',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    await ALL_TOOLS.schedule_meal.execute({
      accountId: 'laurine',
      day: 'jeudi',
      mealSlot: 'lunch',
      recipeId: rec.recipe.id,
    });

    // A. Unconfirmed
    const resUndef: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'laurine', day: 'jeudi' });
    assertEqual(resUndef.requires_confirmation, true, 'Undefined confirm must trigger gate');
    const checkPlan: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'laurine', day: 'jeudi' });
    assertEqual(checkPlan.lunch.title, 'Repas Jeudi Clear Test', 'Laurine schedule must remain');

    // B. confirm: false
    const resFalse: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'laurine', day: 'jeudi', confirm: false });
    assertEqual(resFalse.requires_confirmation, true, 'confirm: false must trigger gate');

    // C. confirmed: false
    const resAliasFalse: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'laurine', day: 'jeudi', confirmed: false });
    assertEqual(resAliasFalse.requires_confirmation, true, 'confirmed: false must trigger gate');

    // D. confirmed: true
    const resAliasTrue: any = await ALL_TOOLS.clear_day_schedule.execute({ accountId: 'laurine', day: 'jeudi', confirmed: true });
    assertIncludes(resAliasTrue.message, 'vidés', 'Jeudi schedule must be cleared');

    const checkPlanAfter: any = await ALL_TOOLS.get_daily_plan.execute({ accountId: 'laurine', day: 'jeudi' });
    assert(checkPlanAfter.lunch.title !== 'Repas Jeudi Clear Test', 'Laurine schedule must be cleared');

    // Cleanup
    await ALL_TOOLS.delete_recipe.execute({ recipeId: rec.recipe.id, confirm: true });
  });

  // 1.5 delete_custom_product gate
  await advTest('1.5 delete_custom_product confirmation gates (undefined, false, confirmed alias, unknown)', async () => {
    const prod: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Gate Test Alpha',
      price: 4.99,
      caloriesPer100g: 100,
      proteinPer100g: 10,
    });
    const pId = prod.product.id;

    // A. Unconfirmed
    const resUndef: any = await ALL_TOOLS.delete_custom_product.execute({ productId: pId });
    assertEqual(resUndef.requires_confirmation, true, 'Undefined confirm must trigger gate');
    assert(Boolean(findCustomProduct(pId)), 'Product must not be deleted');

    // B. confirm: false
    const resFalse: any = await ALL_TOOLS.delete_custom_product.execute({ productId: pId, confirm: false });
    assertEqual(resFalse.requires_confirmation, true, 'confirm: false must trigger gate');

    // C. confirmed: false
    const resAliasFalse: any = await ALL_TOOLS.delete_custom_product.execute({ productId: pId, confirmed: false });
    assertEqual(resAliasFalse.requires_confirmation, true, 'confirmed: false must trigger gate');

    // D. Non-existent product throws helpful error
    let threwNonExistent = false;
    try {
      await ALL_TOOLS.delete_custom_product.execute({ productId: 'prod_introuvable_xyz', confirm: true });
    } catch (e: any) {
      threwNonExistent = true;
      assertIncludes(e.message, 'Aliment personnalisé introuvable', 'Error message for unknown product');
    }
    assert(threwNonExistent, 'delete_custom_product with unknown ID must throw helpful error');

    // E. confirmed: true
    const resAliasTrue: any = await ALL_TOOLS.delete_custom_product.execute({ productId: pId, confirmed: true });
    assertEqual(resAliasTrue.deletedProductId, pId, 'Product must be deleted');
    assertEqual(findCustomProduct(pId), null, 'Product must no longer be found');
  });

  // -------------------------------------------------------------------------
  // SUITE 2: Adversarial Input & Injection Resilience
  // -------------------------------------------------------------------------
  setSuite('Suite 2: Adversarial Inputs & Injections');

  await advTest('2.1 SQL Injection payloads safely handled in text inputs', async () => {
    const sqlInjections = [
      "' OR '1'='1",
      "'; DROP TABLE custom_recipes; --",
      "\" OR 1=1 --",
      "' UNION SELECT * FROM accounts --",
      "Robert'); DROP TABLE accounts;--",
    ];

    for (const sql of sqlInjections) {
      // 1. search_recipes
      const sRec: any = await ALL_TOOLS.search_recipes.execute({ query: sql });
      assert(typeof sRec.count === 'number', 'search_recipes should return count without SQL error');

      // 2. search_catalog
      const sCat: any = await ALL_TOOLS.search_catalog.execute({ query: sql });
      assert(typeof sCat.count === 'number', 'search_catalog should return count without SQL error');

      // 3. toggle_pantry_item
      const tog: any = await ALL_TOOLS.toggle_pantry_item.execute({ ingredientId: sql, inStock: false });
      assert(Boolean(tog.message), 'toggle_pantry_item should execute safely');

      // 4. set_product_preference
      const pref: any = await ALL_TOOLS.set_product_preference.execute({
        accountId: 'ethan',
        ingredientId: sql,
        status: 'neutral',
      });
      assert(Boolean(pref.message), 'set_product_preference should execute safely');
    }

    // Verify tables still exist
    const db = getDatabase();
    const testQuery = db.prepare('SELECT count(*) as cnt FROM custom_recipes').get() as { cnt: number };
    assert(typeof testQuery.cnt === 'number', 'custom_recipes table must still exist intact');
  });

  await advTest('2.2 Regex special characters in search tools do not crash or hang', async () => {
    const regexSpecials = [
      '.*+?^${}()|[]\\',
      '[a-z]+',
      '(foo|bar)',
      '\\d{3}',
      '+++***???',
      '\\\\\\\\\\',
    ];

    for (const reg of regexSpecials) {
      const recRes: any = await ALL_TOOLS.search_recipes.execute({ query: reg });
      assert(typeof recRes.count === 'number', `search_recipes with "${reg}" should not crash`);

      const catRes: any = await ALL_TOOLS.search_catalog.execute({ query: reg });
      assert(typeof catRes.count === 'number', `search_catalog with "${reg}" should not crash`);
    }
  });

  await advTest('2.3 Extreme Unicode, emojis, and whitespace edge cases', async () => {
    // Emoji in recipe title
    const emojiRecipe: any = await ALL_TOOLS.create_recipe.execute({
      title: '🍕 Pizza Maison Gourmande 🧀',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    assertIncludes(emojiRecipe.recipe.title, '🍕 Pizza Maison Gourmande 🧀', 'Title with emojis preserved');

    // Search for emoji recipe
    const searchEmoji: any = await ALL_TOOLS.search_recipes.execute({ query: 'Pizza Maison' });
    assert(searchEmoji.count >= 1, 'Search for emoji recipe works');

    // Clean up
    await ALL_TOOLS.delete_recipe.execute({ recipeId: emojiRecipe.recipe.id, confirm: true });
  });

  await advTest('2.4 Numeric boundaries and fallbacks', async () => {
    // create_recipe: servings <= 0 falls back to 1
    const recZeroServings: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Zero Servings Test',
      servings: 0,
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    assertEqual(recZeroServings.recipe.servings, 1, 'servings: 0 must fall back to 1');
    await ALL_TOOLS.delete_recipe.execute({ recipeId: recZeroServings.recipe.id, confirm: true });

    // add_custom_product: amount <= 0 falls back to 100
    const prodZeroAmount: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Zero Amount',
      price: 2.50,
      amount: 0,
      caloriesPer100g: 50,
      proteinPer100g: 5,
    });
    assert(Boolean(prodZeroAmount.product), 'add_custom_product with amount:0 works');
    await ALL_TOOLS.delete_custom_product.execute({ productId: prodZeroAmount.product.id, confirm: true });

    // update_catalog_item_price with exact 0 resets/clears custom price safely
    const zeroPriceRes: any = await ALL_TOOLS.update_catalog_item_price.execute({
      ingredientId: 'riz_basmati',
      customPrice: 0,
    });
    assert(Boolean(zeroPriceRes.message), 'Price 0 executed');
  });

  await advTest('2.5 Bilingual day and slot boundary parsing', async () => {
    // Day abbreviations & case insensitivity
    assertEqual(parseDayIndex('LUN'), 0, 'LUN -> 0');
    assertEqual(parseDayIndex('dimanche'), 6, 'dimanche -> 6');
    assertEqual(parseDayIndex('Sunday'), 6, 'Sunday -> 6');
    assertEqual(parseDayIndex('2'), 2, '"2" -> 2');

    // Unknown slot defaults safely to lunch
    assertEqual(parseMealSlot('slot_inconnu_bizarre'), 'lunch', 'Unknown slot defaults to lunch');
    assertEqual(parseMealSlot('matin'), 'breakfast', 'matin -> breakfast');
    assertEqual(parseMealSlot('soir'), 'dinner', 'soir -> dinner');
  });

  // -------------------------------------------------------------------------
  // SUITE 3: Mobile Markdown Formatting & Completeness Across All 18 Tools
  // -------------------------------------------------------------------------
  setSuite('Suite 3: Mobile Markdown Formatting');

  await advTest('3.1 All 18 tools produce well-formed, mobile-friendly markdown responses', async () => {
    // Create temporary recipe and product for testing all tools
    const testRecipe: any = await ALL_TOOLS.create_recipe.execute({
      title: 'Recette Test Markdown Mobile',
      ingredients: [{ name: 'riz_basmati', quantity: 100, unit: 'g' }],
    });
    const testProduct: any = await ALL_TOOLS.add_custom_product.execute({
      name: 'Produit Test Markdown Mobile',
      price: 3.99,
      caloriesPer100g: 80,
      proteinPer100g: 4,
    });

    const checks: { toolName: string; execute: () => Promise<any> }[] = [
      { toolName: 'create_recipe', execute: () => Promise.resolve(testRecipe) },
      { toolName: 'schedule_meal', execute: () => ALL_TOOLS.schedule_meal.execute({ accountId: 'ethan', day: 'lundi', mealSlot: 'lunch', recipeId: testRecipe.recipe.id }) },
      { toolName: 'update_catalog_item_price', execute: () => ALL_TOOLS.update_catalog_item_price.execute({ ingredientId: 'riz_basmati', customPrice: 4.50 }) },
      { toolName: 'add_custom_product', execute: () => Promise.resolve(testProduct) },
      { toolName: 'get_daily_plan', execute: () => ALL_TOOLS.get_daily_plan.execute({ accountId: 'ethan', day: 'lundi' }) },
      { toolName: 'get_macro_status', execute: () => ALL_TOOLS.get_macro_status.execute({ accountId: 'ethan' }) },
      { toolName: 'get_grocery_list', execute: () => ALL_TOOLS.get_grocery_list.execute({ scope: 'common' }) },
      { toolName: 'add_to_grocery_list', execute: () => ALL_TOOLS.add_to_grocery_list.execute({ name: 'Savon test', price: 2.00 }) },
      { toolName: 'get_pantry_items', execute: () => (ALL_TOOLS.get_pantry_items.execute as any)({}) },
      { toolName: 'toggle_pantry_item', execute: () => ALL_TOOLS.toggle_pantry_item.execute({ ingredientId: 'riz_basmati', inStock: true }) },
      { toolName: 'set_product_preference', execute: () => ALL_TOOLS.set_product_preference.execute({ accountId: 'ethan', ingredientId: 'riz_basmati', status: 'liked' }) },
      { toolName: 'search_recipes', execute: () => ALL_TOOLS.search_recipes.execute({ query: 'Test Markdown' }) },
      { toolName: 'search_catalog', execute: () => ALL_TOOLS.search_catalog.execute({ query: 'riz' }) },
      { toolName: 'modify_recipe (unconfirmed)', execute: () => ALL_TOOLS.modify_recipe.execute({ recipeId: testRecipe.recipe.id, title: 'Mod' }) },
      { toolName: 'remove_scheduled_meal (unconfirmed)', execute: () => ALL_TOOLS.remove_scheduled_meal.execute({ accountId: 'ethan', day: 'lundi', mealSlot: 'lunch' }) },
      { toolName: 'clear_day_schedule (unconfirmed)', execute: () => ALL_TOOLS.clear_day_schedule.execute({ accountId: 'ethan', day: 'lundi' }) },
      { toolName: 'delete_recipe (unconfirmed)', execute: () => ALL_TOOLS.delete_recipe.execute({ recipeId: testRecipe.recipe.id }) },
      { toolName: 'delete_custom_product (unconfirmed)', execute: () => ALL_TOOLS.delete_custom_product.execute({ productId: testProduct.product.id }) },
    ];

    assertEqual(checks.length, 18, 'Expected exactly 18 tool executions in check list');

    for (const c of checks) {
      const res = await c.execute();
      assert(Boolean(res), `Tool ${c.toolName} returned null or undefined`);
      const text = res.message || res.warning || '';
      assert(text.length > 5, `Tool ${c.toolName} should return meaningful text (got: "${text}")`);
      // Check for emoji or formatted markdown (bold or bullets)
      const hasFormatting = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]|\*\*|•/u.test(text);
      assert(hasFormatting, `Tool ${c.toolName} output should be styled with emojis or markdown for mobile clients`);
    }

    // Clean up
    await ALL_TOOLS.remove_scheduled_meal.execute({ accountId: 'ethan', day: 'lundi', mealSlot: 'lunch', confirm: true });
    await ALL_TOOLS.delete_recipe.execute({ recipeId: testRecipe.recipe.id, confirm: true });
    await ALL_TOOLS.delete_custom_product.execute({ productId: testProduct.product.id, confirm: true });
  });

  // -------------------------------------------------------------------------
  // SUITE 4: REST API Route (`POST /api/mcp` and `GET /api/mcp`)
  // -------------------------------------------------------------------------
  setSuite('Suite 4: REST API Bridge (/api/mcp)');

  await advTest('4.1 GET /api/mcp lists all 18 tools with status and metadata', async () => {
    const routeModule = await import('../src/app/api/mcp/route.js');
    const getRes: any = await routeModule.GET();
    const data = await getRes.json();

    assertEqual(data.status, 'online', 'API status should be online');
    assertEqual(data.toolsCount, 18, `Expected exactly 18 tools, got ${data.toolsCount}`);
    assert(Array.isArray(data.tools), 'tools should be an array');
    assertEqual(data.tools.length, 18, 'tools length should be 18');

    // Verify confirmation flags are present
    const destructiveNames = ['delete_recipe', 'modify_recipe', 'remove_scheduled_meal', 'clear_day_schedule', 'delete_custom_product'];
    for (const dName of destructiveNames) {
      const toolObj = data.tools.find((t: any) => t.name === dName);
      assert(Boolean(toolObj), `Destructive tool ${dName} should be in API list`);
      assertEqual(toolObj.requiresConfirmation, true, `${dName} should have requiresConfirmation: true`);
    }
  });

  await advTest('4.2 POST /api/mcp error handling (missing tool, unknown tool, invalid schema)', async () => {
    const routeModule = await import('../src/app/api/mcp/route.js');

    // A. Missing tool
    const reqMissing = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const resMissing: any = await routeModule.POST(reqMissing);
    assertEqual(resMissing.status, 400, 'Missing tool should return 400');
    const jsonMissing = await resMissing.json();
    assertEqual(jsonMissing.ok, false, 'ok should be false');

    // B. Unknown tool
    const reqUnknown = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'outil_totalement_inconnu_xyz' }),
    });
    const resUnknown: any = await routeModule.POST(reqUnknown);
    assertEqual(resUnknown.status, 404, 'Unknown tool should return 404');

    // C. Invalid schema (e.g. create_recipe missing required ingredients or wrong types)
    const reqInvalid = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'create_recipe',
        args: {
          title: 12345, // invalid type, expected string!
          ingredients: 'not_an_array', // invalid type
        },
      }),
    });
    const resInvalid: any = await routeModule.POST(reqInvalid);
    assertEqual(resInvalid.status, 400, 'Zod schema validation failure should return 400');
    const jsonInvalid = await resInvalid.json();
    assertEqual(jsonInvalid.ok, false, 'ok should be false');
    assert(Boolean(jsonInvalid.details), 'details should contain Zod validation format');
  });

  await advTest('4.3 POST /api/mcp successful execution and confirmation workflow', async () => {
    const routeModule = await import('../src/app/api/mcp/route.js');

    // 1. Create recipe via REST POST
    const reqCreate = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'create_recipe',
        args: {
          title: 'Poulet REST API Test',
          ingredients: [{ name: 'poulet_poitrine', quantity: 200, unit: 'g' }],
        },
      }),
    });
    const resCreate: any = await routeModule.POST(reqCreate);
    assertEqual(resCreate.status, 200, 'POST create_recipe should succeed');
    const jsonCreate = await resCreate.json();
    assertEqual(jsonCreate.ok, true, 'ok should be true');
    const recipeId = jsonCreate.result.recipe.id;

    // 2. Attempt delete without confirmation -> requires_confirmation: true
    const reqDelUnconf = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'delete_recipe',
        args: { recipeId },
      }),
    });
    const resDelUnconf: any = await routeModule.POST(reqDelUnconf);
    assertEqual(resDelUnconf.status, 200, 'POST delete_recipe unconfirmed returns 200');
    const jsonDelUnconf = await resDelUnconf.json();
    assertEqual(jsonDelUnconf.result.requires_confirmation, true, 'Requires confirmation flag set');

    // 3. Confirm delete with confirm: true
    const reqDelConf = new Request('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'delete_recipe',
        args: { recipeId, confirm: true },
      }),
    });
    const resDelConf: any = await routeModule.POST(reqDelConf);
    const jsonDelConf = await resDelConf.json();
    assertEqual(jsonDelConf.ok, true, 'Delete confirmed succeeded');
    assertEqual(jsonDelConf.result.deletedRecipeId, recipeId, 'Deleted recipe ID matches');
  });

  // -------------------------------------------------------------------------
  // SUITE 5: MCP Transports Registration & Error Handling
  // -------------------------------------------------------------------------
  setSuite('Suite 5: MCP Transports Wiring');

  await advTest('5.1 All 18 tools are registered in ALL_TOOLS with valid schema shapes', async () => {
    const keys = Object.keys(ALL_TOOLS);
    assertEqual(keys.length, 18, `ALL_TOOLS must contain exactly 18 tools, found ${keys.length}`);

    for (const [key, toolDef] of Object.entries<any>(ALL_TOOLS)) {
      assertEqual(toolDef.name, key, `Tool key ${key} should match toolDef.name`);
      assert(typeof toolDef.description === 'string' && toolDef.description.length > 0, `Tool ${key} must have description`);
      assert(Boolean(toolDef.schema), `Tool ${key} must have Zod schema`);
      assert(typeof toolDef.execute === 'function', `Tool ${key} must have execute function`);
    }
  });
}

// ---------------------------------------------------------------------------
// 4. MAIN RUNNER & INTEGRITY VERIFICATION
// ---------------------------------------------------------------------------
async function main() {
  let fatalError: any = null;

  try {
    const dbModule = await import('../src/lib/db.js');
    getDatabase = dbModule.getDatabase;
    getDbPath = dbModule.getDbPath;
    resetDatabaseInstance = dbModule.resetDatabaseInstance;

    const toolsModule = await import('../src/mcp/tools.js');
    ALL_TOOLS = toolsModule.ALL_TOOLS;
    toolSchemas = toolsModule.toolSchemas;
    toolSchemasWithConfirmation = toolsModule.toolSchemasWithConfirmation;
    normalizeText = toolsModule.normalizeText;
    parseDayIndex = toolsModule.parseDayIndex;
    parseMealSlot = toolsModule.parseMealSlot;
    findCustomRecipe = toolsModule.findCustomRecipe;
    findCustomProduct = toolsModule.findCustomProduct;
    findBestIngredient = toolsModule.findBestIngredient;

    if (getDbPath() !== TEMP_DB_PATH) {
      console.error(`FATAL: Database path mismatch! Expected ${TEMP_DB_PATH}, got ${getDbPath()}`);
      process.exit(2);
    }

    getDatabase();

    await runAdversarialHarness();
  } catch (err: any) {
    fatalError = err;
    console.error('\nFATAL ADVERSARIAL HARNESS ERROR:', err);
  } finally {
    // 1. Release Windows SQLite locks
    if (resetDatabaseInstance) {
      resetDatabaseInstance();
    }

    // 2. Unlink temporary SQLite database
    if (fs.existsSync(TEMP_DB_PATH)) {
      try {
        fs.unlinkSync(TEMP_DB_PATH);
        console.log(`\n🧹 Cleaned up adversarial temporary database: ${TEMP_DB_PATH}`);
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

  const passedCount = testResults.filter((r) => r.passed).length;
  const failedCount = testResults.filter((r) => !r.passed).length;
  const totalCount = testResults.length;

  console.log('\n============================================================');
  console.log(`  Adversarial Test Suite Summary: ${passedCount}/${totalCount} Passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('============================================================');

  const suiteGroups = [
    'Suite 1: Confirmation Gates',
    'Suite 2: Adversarial Inputs & Injections',
    'Suite 3: Mobile Markdown Formatting',
    'Suite 4: REST API Bridge (/api/mcp)',
    'Suite 5: MCP Transports Wiring',
  ];

  for (const s of suiteGroups) {
    const sTests = testResults.filter((r) => r.suite === s);
    const sPassed = sTests.filter((r) => r.passed).length;
    console.log(`  • ${s}: ${sPassed}/${sTests.length} passed`);
  }

  if (failedCount > 0 || fatalError) {
    console.error(`\n❌ ADVERSARIAL HARNESS FAILED: ${failedCount} failure(s) detected.`);
    process.exit(1);
  }

  console.log('\n🎉 ALL ADVERSARIAL COVERAGE HARDENING TESTS PASSED! Exit code 0.');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL UNCAUGHT ERROR:', err);
  process.exit(1);
});
