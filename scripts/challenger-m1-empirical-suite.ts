import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ALL_TOOLS, parseDayIndex, parseMealSlot, normalizeText } from '../src/mcp/tools';
import {
  getDbPath,
  getDatabase,
  resetDatabaseInstance,
  saveCustomRecipe,
  getCustomRecipeById,
  saveCustomProduct,
  getPreferencesForAccount,
  getCustomGroceryItems,
  getScheduledMeals
} from '../src/lib/db';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, error?: any, details?: any) {
  results.push({
    name,
    passed,
    error: error ? (error.stack || error.message || String(error)) : undefined,
    details
  });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${name}`);
  if (!passed && error) {
    console.error('   Error:', error);
  }
}

async function runEmpiricalSuite() {
  console.log('====================================================');
  console.log('CHALLENGER 2 - M1 EMPIRICAL ADVERSARIAL TEST SUITE');
  console.log('====================================================\n');

  // Record production db stat before tests
  const prodDbPath = path.join(process.cwd(), 'data', 'food_planner.sqlite');
  let prodDbStatBefore: fs.Stats | null = null;
  if (fs.existsSync(prodDbPath)) {
    prodDbStatBefore = fs.statSync(prodDbPath);
  }

  // ----------------------------------------------------
  // TEST 4: SQLite Database File Locking & EBUSY Release
  // ----------------------------------------------------
  console.log('>>> [TEST 4] Testing SQLite File Locking & resetDatabaseInstance() on Windows...');
  const lockTempDir = path.join(os.tmpdir(), `fp_test_lock_${Date.now()}`);
  const lockTempDb = path.join(lockTempDir, 'nested_dir', 'lock_test.sqlite');

  try {
    process.env.FOOD_PLANNER_DB_PATH = lockTempDb;
    resetDatabaseInstance();
    const db = getDatabase();
    db.exec(`CREATE TABLE lock_check (id INTEGER PRIMARY KEY, value TEXT);`);
    db.prepare(`INSERT INTO lock_check (value) VALUES (?);`).run('locked_value');

    // Attempt delete without closing
    let deleteFailedAsExpected = false;
    try {
      fs.unlinkSync(lockTempDb);
    } catch (err: any) {
      deleteFailedAsExpected = (err.code === 'EBUSY' || err.code === 'EPERM');
      console.log(`   Expected Windows file lock caught: code=${err.code}`);
    }

    recordTest(
      'SQLite Windows File Lock: unlinking active DB is blocked by OS (EBUSY/EPERM)',
      deleteFailedAsExpected,
      deleteFailedAsExpected ? undefined : new Error('Expected file deletion to fail while DB was open')
    );

    // Call resetDatabaseInstance() to close and release lock
    resetDatabaseInstance();

    let deleteSucceededAfterReset = false;
    try {
      fs.unlinkSync(lockTempDb);
      deleteSucceededAfterReset = true;
    } catch (err: any) {
      console.error('   Failed to delete after resetDatabaseInstance:', err);
    }

    recordTest(
      'SQLite Windows Lock Release: resetDatabaseInstance() frees file lock allowing fs.unlinkSync()',
      deleteSucceededAfterReset
    );

    // Clean up directory
    try {
      fs.rmSync(lockTempDir, { recursive: true, force: true });
    } catch {}
  } catch (err: any) {
    recordTest('SQLite File Locking & Release', false, err);
  }

  // ----------------------------------------------------
  // SETUP ISOLATED TEST DB FOR REMAINING TESTS
  // ----------------------------------------------------
  console.log('\n>>> Setting up isolated temporary test database...');
  const mainTestDb = path.join(os.tmpdir(), `fp_challenger_m1_${Date.now()}.sqlite`);
  process.env.FOOD_PLANNER_DB_PATH = mainTestDb;
  resetDatabaseInstance();
  const testDb = getDatabase();

  recordTest(
    'DB Isolation: FOOD_PLANNER_DB_PATH correctly sets isolated DB path',
    getDbPath() === mainTestDb
  );

  // ----------------------------------------------------
  // TEST 3: saveCustomRecipe with Custom Product Macros
  // ----------------------------------------------------
  console.log('\n>>> [TEST 3] Testing saveCustomRecipe with custom product macros...');
  try {
    const customProduct = saveCustomProduct({
      name: 'Poudre Protéinée Végétale Pure',
      aisle: 'EPICERIE',
      packaging: {
        amount: 500,
        unit: 'g',
        label: 'Pot de 500g',
        regularPriceMetro: 24.99,
        exactPriceMetro: 24.99,
        unitPricePer100g: 5.00,
        unitPriceLabel: '5.00 $ / 100g',
        priceMaxi: 24.99,
        priceSuperC: 24.99,
        priceIGA: 24.99,
        isTaxable: false,
        isMoiMemberPrice: false,
      },
      macrosPer100g: {
        calories: 380,
        protein: 75,
        carbs: 10,
        fat: 4,
      },
    });

    // Create recipe using 50g of this custom product (servings = 1)
    // Expected macros from 50g: 380 * 0.5 = 190 kcal, 75 * 0.5 = 37.5g protein, 5g carbs, 2g fat
    const recipeWithCustom = saveCustomRecipe({
      title: 'Shake Protéiné Végétal',
      servings: 1,
      ingredients: [
        {
          ingredientId: customProduct.id,
          quantity: 50,
          unit: 'g',
        },
      ],
    });

    const macrosNotZero = recipeWithCustom.caloriesPerServing > 0 && recipeWithCustom.proteinPerServing > 0;
    const macrosAccurate = Math.abs(recipeWithCustom.caloriesPerServing - 190) <= 2 &&
      Math.abs(recipeWithCustom.proteinPerServing - 37.5) <= 1;

    recordTest(
      'saveCustomRecipe: Custom product ingredients preserve computed non-zero macros',
      macrosNotZero && macrosAccurate,
      undefined,
      {
        calories: recipeWithCustom.caloriesPerServing,
        protein: recipeWithCustom.proteinPerServing,
        carbs: recipeWithCustom.carbsPerServing,
        fat: recipeWithCustom.fatPerServing,
      }
    );

    // Test fallback manual macros when ingredient cannot be computed
    const fallbackRecipe = saveCustomRecipe({
      title: 'Repas Ingrédient Inconnu avec Macros Manuels',
      servings: 2,
      caloriesPerServing: 620,
      proteinPerServing: 48,
      carbsPerServing: 65,
      fatPerServing: 18,
      ingredients: [
        {
          ingredientId: 'ingredient_mystere_non_reference',
          quantity: 200,
          unit: 'g',
        },
      ],
    });

    const fallbackPreserved = fallbackRecipe.caloriesPerServing === 620 &&
      fallbackRecipe.proteinPerServing === 48 &&
      fallbackRecipe.carbsPerServing === 65 &&
      fallbackRecipe.fatPerServing === 18;

    recordTest(
      'saveCustomRecipe: Manual macro fallback overrides 0 when calculation returns 0',
      fallbackPreserved,
      undefined,
      {
        calories: fallbackRecipe.caloriesPerServing,
        protein: fallbackRecipe.proteinPerServing,
      }
    );
  } catch (err: any) {
    recordTest('saveCustomRecipe Macro Preservation', false, err);
  }

  // ----------------------------------------------------
  // TEST 2: Tool 18 set_product_preference
  // ----------------------------------------------------
  console.log('\n>>> [TEST 2] Testing Tool 18 set_product_preference...');
  try {
    const tool = ALL_TOOLS.set_product_preference;

    // Test liked
    const resLiked = await tool.execute({
      ingredientId: 'poulet_poitrine',
      status: 'liked',
      accountId: 'ethan',
    });
    const prefsLiked = getPreferencesForAccount('ethan');
    const likedSuccess = prefsLiked['poulet_poitrine'] === 'liked' &&
      resLiked.message.includes('Aimé');

    recordTest(
      'set_product_preference: status "liked" correctly records in ethan preferences',
      likedSuccess,
      undefined,
      { result: resLiked, recorded: prefsLiked['poulet_poitrine'] }
    );

    // Test disliked
    const resDisliked = await tool.execute({
      ingredientId: 'champignons_blancs',
      status: 'disliked',
      accountId: 'ethan',
    });
    const prefsDisliked = getPreferencesForAccount('ethan');
    const dislikedSuccess = prefsDisliked['champignons_blancs'] === 'disliked' &&
      resDisliked.message.includes('Exclu');

    recordTest(
      'set_product_preference: status "disliked" correctly records in ethan preferences',
      dislikedSuccess,
      undefined,
      { result: resDisliked, recorded: prefsDisliked['champignons_blancs'] }
    );

    // Test neutral (removes previous preference)
    const resNeutral = await tool.execute({
      ingredientId: 'poulet_poitrine',
      status: 'neutral',
      accountId: 'ethan',
    });
    const prefsNeutral = getPreferencesForAccount('ethan');
    const neutralSuccess = prefsNeutral['poulet_poitrine'] === undefined &&
      resNeutral.message.includes('Neutre');

    recordTest(
      'set_product_preference: status "neutral" resets and clears preference',
      neutralSuccess,
      undefined,
      { result: resNeutral, recorded: prefsNeutral['poulet_poitrine'] }
    );

    // Test fuzzy matching for ingredient in set_product_preference
    const resFuzzy = await tool.execute({
      ingredientId: 'brocoli',
      status: 'liked',
      accountId: 'laurine',
    });
    const prefsLaurine = getPreferencesForAccount('laurine');
    const fuzzySuccess = prefsLaurine[resFuzzy.ingredientId] === 'liked';

    recordTest(
      'set_product_preference: fuzzy matches ingredient names and updates laurine preferences',
      fuzzySuccess,
      undefined,
      { matchedId: resFuzzy.ingredientId, recorded: prefsLaurine[resFuzzy.ingredientId] }
    );
  } catch (err: any) {
    recordTest('set_product_preference', false, err);
  }

  // ----------------------------------------------------
  // TEST 5: get_grocery_list with scopes ethan, laurine, common
  // ----------------------------------------------------
  console.log('\n>>> [TEST 5] Testing get_grocery_list scopes (ethan, laurine, common)...');
  try {
    // Add custom grocery items for ethan, laurine, and common
    await ALL_TOOLS.add_to_grocery_list.execute({
      name: 'Café Espresso grains',
      aisle: 'epicerie',
      price: 14.99,
      forAccount: 'ethan',
    });

    await ALL_TOOLS.add_to_grocery_list.execute({
      name: 'Thé Matcha japonais',
      aisle: 'epicerie',
      price: 18.50,
      forAccount: 'laurine',
    });

    await ALL_TOOLS.add_to_grocery_list.execute({
      name: 'Papier essuie-tout 6 rouleaux',
      aisle: 'divers',
      price: 9.99,
      forAccount: 'common',
    });

    // Scope 'ethan'
    const listEthan = await ALL_TOOLS.get_grocery_list.execute({ scope: 'ethan' });
    const ethanHasCafe = listEthan.items.some((i: any) => i.name.includes('Café Espresso'));
    const ethanHasCommon = listEthan.items.some((i: any) => i.name.includes('Papier essuie-tout'));
    const ethanHasNoMatcha = !listEthan.items.some((i: any) => i.name.includes('Thé Matcha'));

    recordTest(
      'get_grocery_list (scope ethan): includes ethan items + common items, excludes laurine private items',
      ethanHasCafe && ethanHasCommon && ethanHasNoMatcha,
      undefined,
      { itemCount: listEthan.itemCount, scope: listEthan.scope }
    );

    // Scope 'laurine'
    const listLaurine = await ALL_TOOLS.get_grocery_list.execute({ scope: 'laurine' });
    const laurineHasMatcha = listLaurine.items.some((i: any) => i.name.includes('Thé Matcha'));
    const laurineHasCommon = listLaurine.items.some((i: any) => i.name.includes('Papier essuie-tout'));
    const laurineHasNoCafe = !listLaurine.items.some((i: any) => i.name.includes('Café Espresso'));

    recordTest(
      'get_grocery_list (scope laurine): includes laurine items + common items, excludes ethan private items',
      laurineHasMatcha && laurineHasCommon && laurineHasNoCafe,
      undefined,
      { itemCount: listLaurine.itemCount, scope: listLaurine.scope }
    );

    // Scope 'common'
    const listCommon = await ALL_TOOLS.get_grocery_list.execute({ scope: 'common' });
    const commonHasAll = listCommon.items.some((i: any) => i.name.includes('Café Espresso')) &&
      listCommon.items.some((i: any) => i.name.includes('Thé Matcha')) &&
      listCommon.items.some((i: any) => i.name.includes('Papier essuie-tout'));

    recordTest(
      'get_grocery_list (scope common): aggregates all items with receipt totals and taxes',
      commonHasAll && listCommon.totalWithTax.includes('$ CAD'),
      undefined,
      { totalWithTax: listCommon.totalWithTax, savings: listCommon.savingsAmount }
    );
  } catch (err: any) {
    recordTest('get_grocery_list scopes', false, err);
  }

  // ----------------------------------------------------
  // TEST 1: All 18 Tools in ALL_TOOLS Invocation
  // ----------------------------------------------------
  console.log('\n>>> [TEST 1] Invoking all 18 tools with valid parameters...');

  const toolNames = Object.keys(ALL_TOOLS);
  recordTest('ALL_TOOLS: exactly 18 tools registered', toolNames.length === 18, undefined, { count: toolNames.length });

  // Dedicated test recipes and entities so each tool operates safely
  const recipeForSchedule = saveCustomRecipe({
    title: 'Recette Test Schedule Meal',
    caloriesPerServing: 450,
    proteinPerServing: 35
  });

  const recipeForModify = saveCustomRecipe({
    title: 'Recette Test Modification Initiale',
    caloriesPerServing: 300,
    proteinPerServing: 20
  });

  const recipeForDelete = saveCustomRecipe({
    title: 'Recette Test Suppression Finale',
    caloriesPerServing: 500,
    proteinPerServing: 40
  });

  const productForDelete = saveCustomProduct({
    name: 'Produit Test Pour Suppression',
    aisle: 'EPICERIE',
    packaging: {
      amount: 100,
      unit: 'g',
      label: '100g',
      regularPriceMetro: 2.99,
      exactPriceMetro: 2.99,
      unitPricePer100g: 2.99,
      unitPriceLabel: '2.99 $ / 100g',
      priceMaxi: 2.99,
      priceSuperC: 2.99,
      priceIGA: 2.99,
      isTaxable: false,
      isMoiMemberPrice: false
    },
    macrosPer100g: { calories: 100, protein: 10, carbs: 10, fat: 2 }
  });

  for (const name of toolNames) {
    try {
      const tool = (ALL_TOOLS as any)[name];
      let res: any;

      switch (name) {
        case 'create_recipe': {
          res = await tool.execute({
            title: 'Omelette Express Épinards et Fromage',
            mealType: 'dejeuner',
            prepTimeMinutes: 5,
            cookTimeMinutes: 7,
            servings: 1,
            ingredients: [
              { name: 'oeufs', quantity: 3, unit: 'unite' },
              { name: 'beurre', quantity: 10, unit: 'g' },
              { name: 'fromage cheddar', quantity: 30, unit: 'g' }
            ],
            instructions: ['Battre les œufs', 'Cuire à feu doux', 'Ajouter le fromage'],
            tags: ['keto', 'rapide']
          });
          break;
        }

        case 'schedule_meal': {
          res = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday', // English day parsing test
            mealSlot: 'breakfast', // English slot parsing test
            recipeId: recipeForSchedule.id
          });
          break;
        }

        case 'update_catalog_item_price': {
          res = await tool.execute({
            ingredientId: 'oeufs_larges',
            customPrice: 4.19
          });
          break;
        }

        case 'add_custom_product': {
          res = await tool.execute({
            name: 'Biscuits Protéinés Avoine Cacao',
            aisle: 'boulangerie',
            price: 6.49,
            amount: 250,
            unit: 'g',
            packageLabel: 'Boîte de 250g',
            caloriesPer100g: 410,
            proteinPer100g: 22,
            carbsPer100g: 50,
            fatPer100g: 14,
            isTaxable: true
          });
          break;
        }

        case 'get_daily_plan': {
          res = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday'
          });
          break;
        }

        case 'get_macro_status': {
          res = await tool.execute({
            accountId: 'laurine'
          });
          break;
        }

        case 'get_grocery_list': {
          res = await tool.execute({
            scope: 'common'
          });
          break;
        }

        case 'add_to_grocery_list': {
          res = await tool.execute({
            name: 'Eau gazeuse lime',
            aisle: 'epicerie',
            price: 3.99,
            packageDescription: 'Pack de 12 cannettes',
            forAccount: 'common'
          });
          break;
        }

        case 'get_pantry_items': {
          res = await tool.execute({});
          break;
        }

        case 'toggle_pantry_item': {
          res = await tool.execute({
            ingredientId: 'riz_basmati',
            inStock: true
          });
          break;
        }

        case 'set_product_preference': {
          res = await tool.execute({
            ingredientId: 'saumon_atlantique',
            status: 'liked',
            accountId: 'ethan'
          });
          break;
        }

        case 'search_recipes': {
          res = await tool.execute({
            query: 'omelette',
            mealType: 'dejeuner'
          });
          break;
        }

        case 'search_catalog': {
          res = await tool.execute({
            query: 'bœuf' // ligature test
          });
          break;
        }

        case 'modify_recipe': {
          // Unconfirmed preview
          const unconf = await tool.execute({
            recipeId: recipeForModify.id,
            title: 'Recette Test Modifiée Confirmée',
            servings: 2,
            confirm: false
          });
          if (!unconf.requires_confirmation) throw new Error('modify_recipe did not require confirmation');

          // Confirmed execution
          res = await tool.execute({
            recipeId: recipeForModify.id,
            title: 'Recette Test Modifiée Confirmée',
            servings: 2,
            confirm: true
          });
          break;
        }

        case 'remove_scheduled_meal': {
          // Unconfirmed preview
          const unconf = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday',
            mealSlot: 'breakfast'
          });
          if (!unconf.requires_confirmation) throw new Error('remove_scheduled_meal did not require confirmation');

          // Confirmed execution
          res = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday',
            mealSlot: 'breakfast',
            confirm: true
          });
          break;
        }

        case 'clear_day_schedule': {
          // Unconfirmed preview
          const unconf = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday'
          });
          if (!unconf.requires_confirmation) throw new Error('clear_day_schedule did not require confirmation');

          // Confirmed execution with confirmed: true (alias test)
          res = await tool.execute({
            accountId: 'ethan',
            day: 'Wednesday',
            confirmed: true
          });
          break;
        }

        case 'delete_recipe': {
          // Unconfirmed preview
          const unconf = await tool.execute({
            recipeId: recipeForDelete.id
          });
          if (!unconf.requires_confirmation) throw new Error('delete_recipe did not require confirmation');

          // Confirmed execution
          res = await tool.execute({
            recipeId: recipeForDelete.id,
            confirm: true
          });
          break;
        }

        case 'delete_custom_product': {
          // Unconfirmed preview
          const unconf = await tool.execute({
            productId: productForDelete.id
          });
          if (!unconf.requires_confirmation) throw new Error('delete_custom_product did not require confirmation');

          // Confirmed execution
          res = await tool.execute({
            productId: productForDelete.id,
            confirm: true
          });
          break;
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      const hasMessage = typeof res === 'object' && typeof res.message === 'string' && res.message.length > 0;
      recordTest(`Tool [${name}]: executes without error and returns formatted markdown message`, hasMessage);
    } catch (err: any) {
      recordTest(`Tool [${name}] execution`, false, err);
    }
  }

  // ----------------------------------------------------
  // ADVERSARIAL STRESS CASES & EDGE CASES
  // ----------------------------------------------------
  console.log('\n>>> Testing adversarial stress scenarios and edge cases...');

  // 1. Negative price in update_catalog_item_price
  try {
    let rejected = false;
    try {
      await ALL_TOOLS.update_catalog_item_price.execute({
        ingredientId: 'riz_basmati',
        customPrice: -5.0
      });
    } catch (e: any) {
      rejected = e.message.includes('supérieur ou égal à 0');
    }
    recordTest('Adversarial: update_catalog_item_price rejects negative prices gracefully', rejected);
  } catch (err: any) {
    recordTest('Adversarial: negative price', false, err);
  }

  // 2. Destructive tool protection: prevent deleting native Metro items
  try {
    let nativeProtected = false;
    try {
      await ALL_TOOLS.delete_custom_product.execute({
        productId: 'poulet_poitrine',
        confirm: true
      });
    } catch (e: any) {
      nativeProtected = e.message.includes('introuvable') || e.message.includes('Metro ne peuvent pas être supprimés');
    }
    recordTest('Adversarial: delete_custom_product blocks deletion of native Metro items', nativeProtected);
  } catch (err: any) {
    recordTest('Adversarial: native product protection', false, err);
  }

  // 3. Destructive tool protection: prevent deleting native Metro recipes
  try {
    let nativeRecipeProtected = false;
    try {
      await ALL_TOOLS.delete_recipe.execute({
        recipeId: 'poulet_curry_coco_riz',
        confirm: true
      });
    } catch (e: any) {
      nativeRecipeProtected = e.message.includes('introuvable') || e.message.includes('Metro ne peuvent pas');
    }
    recordTest('Adversarial: delete_recipe blocks deletion of native Metro recipes', nativeRecipeProtected);
  } catch (err: any) {
    recordTest('Adversarial: native recipe protection', false, err);
  }

  // 4. Day parser with invalid input
  try {
    let invalidDayHandled = false;
    try {
      await ALL_TOOLS.schedule_meal.execute({
        accountId: 'ethan',
        day: 'invalid_day_xyz',
        mealSlot: 'lunch',
        recipeId: recipeForSchedule.id
      });
    } catch (e: any) {
      invalidDayHandled = e.message.includes('Jour non reconnu');
    }
    recordTest('Adversarial: schedule_meal rejects invalid day with clear suggestions', invalidDayHandled);
  } catch (err: any) {
    recordTest('Adversarial: invalid day', false, err);
  }

  // 5. Normalization ligatures and bilingual slot aliases
  try {
    const ligatureBoeuf = normalizeText('bœuf') === 'boeuf';
    const ligatureCaecum = normalizeText('cæcum') === 'caecum';
    const slotBreakfast = parseMealSlot('petit-déjeuner') === 'breakfast';
    const slotLunch = parseMealSlot('dîner') === 'lunch';
    const slotDinner = parseMealSlot('souper') === 'dinner';
    const slotSnack = parseMealSlot('collation') === 'snack';
    const dayMonday = parseDayIndex('Monday') === 0;
    const dayLundi = parseDayIndex('Lundi') === 0;
    const dayFriday = parseDayIndex('Vendredi') === 4;
    const dayFri = parseDayIndex('fri') === 4;
    const dayIndex6 = parseDayIndex(6) === 6;

    recordTest(
      'Adversarial: Ligatures (œ, æ), bilingual days (FR/EN/num) and slots parsing',
      ligatureBoeuf && ligatureCaecum && slotBreakfast && slotLunch && slotDinner && slotSnack &&
      dayMonday && dayLundi && dayFriday && dayFri && dayIndex6
    );
  } catch (err: any) {
    recordTest('Adversarial: Ligatures & Bilingual parsing', false, err);
  }

  // ----------------------------------------------------
  // TEST 6: Verify data/food_planner.sqlite was NEVER written to
  // ----------------------------------------------------
  console.log('\n>>> [TEST 6] Verifying data/food_planner.sqlite pristine status...');
  if (prodDbStatBefore) {
    const prodDbStatAfter = fs.statSync(prodDbPath);
    const mtimeUnchanged = prodDbStatBefore.mtimeMs === prodDbStatAfter.mtimeMs;
    const sizeUnchanged = prodDbStatBefore.size === prodDbStatAfter.size;
    recordTest(
      'Database Isolation Verification: data/food_planner.sqlite size and mtime completely unchanged',
      mtimeUnchanged && sizeUnchanged,
      undefined,
      { before: prodDbStatBefore.mtimeMs, after: prodDbStatAfter.mtimeMs }
    );
  } else {
    const stillNotExists = !fs.existsSync(prodDbPath);
    recordTest('Database Isolation Verification: data/food_planner.sqlite was never created or touched', stillNotExists);
  }

  // Cleanup test db
  resetDatabaseInstance();
  try {
    if (fs.existsSync(mainTestDb)) {
      fs.unlinkSync(mainTestDb);
    }
  } catch {}

  // ----------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('TEST SUITE SUMMARY');
  console.log('====================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Tests : ${total}`);
  console.log(`Passed      : ${passed}`);
  console.log(`Failed      : ${failed}`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`- ${r.name}`);
      if (r.error) console.log(`  ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ADVERSARIAL STRESS TESTS PASSED EMPIRICALLY (100%)!');
    process.exit(0);
  }
}

runEmpiricalSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
