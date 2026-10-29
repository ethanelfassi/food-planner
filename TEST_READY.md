# FoodPlanner Test Suite Ready (Milestone M2)

## Status: READY & VERIFIED (100% Pass)

The comprehensive automated E2E test suite for FoodPlanner MCP tools has been built, hardened, and verified with **100% pass rate** across all 18 tools and 4 tiers.

---

## 1. Quick Start / Test Invocation

Run the automated test suite with standard npm script:
```bash
npm test
```

Or execute directly using tsx:
```bash
npx tsx scripts/test-mcp-tools.ts
```

To verify TypeScript type-safety:
```bash
npx tsc --noEmit
```

---

## 2. Test Execution Summary

```
============================================================
  FoodPlanner MCP Tools Automated E2E Test Suite
  Isolated SQLite: %TEMP%\food_planner_e2e_*.sqlite
============================================================
  • Tier 1: Feature Coverage: 18/18 passed (100%)
  • Tier 2: Boundary & Corner Cases: 8/8 passed (100%)
  • Tier 3: Cross-Feature Integration Flows: 3/3 passed (100%)
  • Tier 4: Real-World Scenarios: 3/3 passed (100%)

  Total: 32/32 tests passed (100% success rate)
  Exit code: 0
============================================================
```

---

## 3. Tier-by-Tier Coverage Details

### Tier 1: Feature Coverage (All 18 MCP Tools)
- [x] **1.1 `create_recipe`**: Recipe creation with smart Metro catalog mapping, per-serving macro calculations (calories, protein, carbs, fat), estimated cost, and mobile markdown.
- [x] **1.2 `search_recipes`**: Keyword and title fuzzy search returning formatted list with macro previews and custom badges.
- [x] **1.3 `search_catalog`**: Ingredient search across Metro catalog and custom items with fuzzy matching.
- [x] **1.4 `add_custom_product`**: Custom product creation with packaging, unit price per 100g, and macro tracking.
- [x] **1.5 `update_catalog_item_price`**: Custom price updates and persistence in SQLite.
- [x] **1.6 `schedule_meal`**: Scheduling meals for accounts across French/English day names and slot aliases.
- [x] **1.7 `get_daily_plan`**: Retrieval of daily plans with macro totals and 7-day weekly overview.
- [x] **1.8 `get_macro_status`**: User metabolic targets and weekly grocery budget overview.
- [x] **1.9 `add_to_grocery_list`**: Ad-hoc item addition to shopping list with aisle and tax classification.
- [x] **1.10 `get_grocery_list`**: Consolidated grocery list with pricing, MOI savings, and tax calculations.
- [x] **1.11 `toggle_pantry_item`**: Toggling item in-stock status in pantry.
- [x] **1.12 `get_pantry_items`**: Querying in-stock pantry inventory count and list.
- [x] **1.13 `set_product_preference`**: Setting account-level ingredient preference (liked/disliked/neutral).
- [x] **1.14 `modify_recipe`**: Modification of recipe metadata, prep time, or ingredients with confirmed execution.
- [x] **1.15 `remove_scheduled_meal`**: Slot clearing for scheduled meals with confirmed execution.
- [x] **1.16 `clear_day_schedule`**: Full-day schedule clearing with confirmed execution.
- [x] **1.17 `delete_recipe`**: Permanent custom recipe deletion with confirmed execution.
- [x] **1.18 `delete_custom_product`**: Permanent custom product deletion with confirmed execution.

### Tier 2: Boundary & Corner Cases (Defensive Logic)
- [x] **2.1 Empty & Whitespace Guard**: Empty/whitespace strings in `findCustomRecipe`, `findCustomProduct`, and `schedule_meal` return `null` or throw with suggestions, never erroneously matching index 0.
- [x] **2.2 Negative Price Rejection & Reset**: Negative prices (`-5.00`) are rejected with validation errors; `null` resets custom prices to official Metro rates.
- [x] **2.3 Unknown Items & Suggestions**: Unknown catalog queries or unmapped recipe schedules return helpful suggestions without crashing.
- [x] **2.4 Accents & Ligatures**: Full support for `œ` -> `oe`, `æ` -> `ae`, and diacritics (`é`, `è`, `ê`, `à`, `ç`) across catalog searches.
- [x] **2.5 Bilingual Day Parser**: French (`lundi`..`dimanche`), English (`Monday`..`Sunday`), short forms (`lun`, `wed`), and indices (`0`..`6`).
- [x] **2.6 Meal Slot Aliases**: Resolution of French and English aliases (`déjeuner`, `lunch`, `dîner`, `souper`, `snack`, `collation`).
- [x] **2.7 Defaults & Macro Proration**:
  - `add_custom_product` defaults `amount = 100` if omitted, avoiding SQLite binding `ERR_INVALID_ARG_TYPE`.
  - `modify_recipe` scales macros proportionally (`(oldMacros * oldServings) / newServings`) when servings change without new ingredients.
- [x] **2.8 Confirmation Guards**: All 5 destructive tools (`delete_recipe`, `modify_recipe`, `remove_scheduled_meal`, `clear_day_schedule`, `delete_custom_product`) block modifications when unconfirmed.

### Tier 3: Cross-Feature Integration Flows
- [x] **3.1 Full Lifecycle Synergy**: Product creation -> catalog search -> recipe creation -> meal scheduling -> daily plan aggregation -> grocery list generation -> pantry stock toggling -> cleanup.
- [x] **3.2 Multi-Account Schedule Isolation**: Schedules for Ethan and Laurine remain isolated; clearing Ethan's day leaves Laurine's day plan untouched.
- [x] **3.3 Recipe Filtering Synergy**: Filtering by `mealType` ('dejeuner' vs 'souper') combined with multi-word search.

### Tier 4: Real-World Scenarios
- [x] **4.1 Full-Week Meal Planning**: Full 7-day schedule across multiple meal slots, verifying weekly plan aggregation and consolidated grocery list pricing.
- [x] **4.2 Store Price Adjustments & Dynamic Budgeting**: Updating staple ingredient prices and verifying price overrides and resets.
- [x] **4.3 Confirmation Cancellation Journey**: User inspects warning, cancels (`confirm: false`), verifies state preserved, then confirms (`confirm: true`), verifying clean mutation.

---

## 4. Production Database Isolation & Verification

- **Target Path Isolation**: Automated tests execute against an ephemeral database in `os.tmpdir()` controlled via `process.env.FOOD_PLANNER_DB_PATH`.
- **Lock Management**: `resetDatabaseInstance()` releases all Windows SQLite handles before file cleanup.
- **Cryptographic Invariant**:
  - Initial SHA-256 (`data/food_planner.sqlite`): `d9ab8d1625293bd78c9f6ec0e90bab9df46e6cf8b049b9b0ddea999037dc236e`
  - Post-run SHA-256 (`data/food_planner.sqlite`): `d9ab8d1625293bd78c9f6ec0e90bab9df46e6cf8b049b9b0ddea999037dc236e`
  - **Mutations on Production Database: Exactly 0 bytes (100% pristine).**
