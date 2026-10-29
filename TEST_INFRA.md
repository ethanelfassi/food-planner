# FoodPlanner Test Infrastructure & Architecture

## 1. Overview & Purpose

This document specifies the automated testing infrastructure for the **FoodPlanner** Model Context Protocol (MCP) tool suite.
FoodPlanner exposes 18 specialized MCP tools (`src/mcp/tools.ts`) enabling mobile and desktop conversational clients (such as ChatMCP) to plan meals, manage recipes, track nutritional macronutrients, coordinate grocery shopping, and adjust pantry inventories.

The test infrastructure guarantees:
1. **100% End-to-End Functional Verification** across all 18 MCP tools.
2. **Absolute Database Isolation**: zero mutation, read pollution, or lock contention against the production SQLite database (`data/food_planner.sqlite`).
3. **Strict Assertion & Failure Semantics**: deterministic failure on unexpected outcomes or unhandled exceptions.

---

## 2. Database Isolation Architecture & Zero-Mutation Guarantee

### 2.1 Isolation Mechanism
FoodPlanner connects to SQLite using Node.js's native `DatabaseSync` engine (`node:sqlite`). To prevent any test execution from touching or corrupting production data, `src/lib/db.ts` dynamically resolves the database path:

```ts
export function getDbPath(): string {
  if (process.env.FOOD_PLANNER_DB_PATH) {
    return process.env.FOOD_PLANNER_DB_PATH;
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  return path.join(process.cwd(), 'data', 'food_planner.sqlite');
}
```

Prior to test execution, the test harness initializes an ephemeral database path in the operating system's temporary directory:
```ts
const tempDbPath = path.join(os.tmpdir(), `food_planner_e2e_${Date.now()}_${process.pid}.sqlite`);
process.env.FOOD_PLANNER_DB_PATH = tempDbPath;
```

### 2.2 Lifecycle & File Lock Release
On Windows systems, SQLite holds active OS-level file handles (`EBUSY`) while connections remain open. The test harness relies on `resetDatabaseInstance()` exported from `src/lib/db.ts`:
- Safely closes `dbInstance.close()`.
- Sets `dbInstance = null`.
- Releases all OS-level file locks.
- Enables safe cleanup via `fs.unlinkSync(tempDbPath)` inside a guaranteed `finally` block.

### 2.3 Cryptographic Integrity Invariant
Before any test logic or database initialization executes, the harness computes a SHA-256 cryptographic digest of `data/food_planner.sqlite`. Upon test completion (and after temporary database cleanup), the harness re-computes the digest and asserts:

$$\text{SHA256}(\text{data/food\_planner.sqlite})_{\text{post}} \equiv \text{SHA256}(\text{data/food\_planner.sqlite})_{\text{pre}}$$

Any mismatch triggers an immediate fatal failure, ensuring 0 bytes of production data were modified.

---

## 3. Four-Tier Test Architecture

The test suite is structured into four progressive tiers to validate behavior from isolated unit functionality up to end-to-end user workflows.

```
┌────────────────────────────────────────────────────────┐
│   Tier 4: Real-World Scenarios                         │
│   (Full-week planning, budget adjustments, cancellations) │
├────────────────────────────────────────────────────────┤
│   Tier 3: Cross-Feature Integration Workflows          │
│   (Recipe -> Catalog -> Schedule -> Plan -> Grocery)    │
├────────────────────────────────────────────────────────┤
│   Tier 2: Boundary & Corner Cases                      │
│   (Empty strings, negative values, accents, days/slots)│
├────────────────────────────────────────────────────────┤
│   Tier 1: Feature Coverage (All 18 MCP Tools)          │
│   (Nominal execution, schema validation, outputs)      │
└────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (18 Tools Nominal Execution)
Verifies nominal execution, schema validation, and expected structured output for every tool:
1. `create_recipe`: Custom recipe creation with automatic ingredient mapping to Metro catalog.
2. `schedule_meal`: Schedules a meal in an account's calendar for a specific day and slot.
3. `update_catalog_item_price`: Updates or overrides custom purchase price for an ingredient.
4. `add_custom_product`: Adds a custom product with packaging, unit price, and per-100g macros.
5. `get_daily_plan`: Retrieves daily or weekly scheduled meals and macro totals.
6. `get_macro_status`: Retrieves daily nutritional targets and caloric budgets for an account.
7. `get_grocery_list`: Generates consolidated grocery shopping lists with pricing and tax summaries.
8. `add_to_grocery_list`: Adds ad-hoc items to the grocery list with aisle mapping.
9. `get_pantry_items`: Queries in-stock inventory count and item list.
10. `toggle_pantry_item`: Inverts or sets explicit in-stock status for pantry items.
11. `set_product_preference`: Records product preference (`liked`, `disliked`, `neutral`) per account.
12. `search_recipes`: Searches recipes by keywords and tag filters.
13. `search_catalog`: Fuzzy searches Metro ingredients with aisle filtering and limit options.
14. `delete_recipe`: Removes custom recipe with confirmed execution.
15. `modify_recipe`: Updates recipe metadata, ingredients, or servings with confirmed execution.
16. `remove_scheduled_meal`: Clears a specific scheduled meal slot with confirmed execution.
17. `clear_day_schedule`: Clears all meals for an entire day with confirmed execution.
18. `delete_custom_product`: Removes custom product from catalog with confirmed execution.

### Tier 2: Boundary & Corner Cases (Robustness & Validation)
Probes edge cases, invalid inputs, and defensive fallbacks:
- **Empty & Whitespace Inputs**: Prevents empty strings from matching index 0 in `findCustomRecipe`, `findCustomProduct`, and `schedule_meal`.
- **Negative & Invalid Prices**: Rejects negative pricing (`-5.00`) in `update_catalog_item_price`; verifies price reset via `null`.
- **Missing Items & Suggestions**: Unknown recipe or product lookups return structured suggestion lists rather than uncaught errors.
- **Accented & Ligature Search**: Normalizes `œ` -> `oe`, `æ` -> `ae`, strips diacritics (`é`, `è`, `ê`, `à`, `ç`), and matches case-insensitively.
- **Bilingual Day Parser**: Accepts French (`Lundi`, `lun`), English (`Monday`, `mon`), and numeric indices (`0`-`6`). Throws clear error on invalid day.
- **Meal Slot Aliases**: Resolves French and English aliases (`petit-déjeuner`, `matin`, `déjeuner`, `midi`, `lunch`, `dîner`, `souper`, `dinner`, `collation`, `snack`, `goûter`).
- **Omitted Parameter Defaults**: Ensures `add_custom_product` defaults `amount = 100` when omitted, preventing SQLite binding exceptions.
- **Servings Macro Proration**: Verifies `modify_recipe` scales macros proportionally (`(oldMacros * oldServings) / newServings`) when `servings` changes without new ingredients.
- **Dual Confirmation Guards**: All 5 destructive tools (`delete_recipe`, `modify_recipe`, `remove_scheduled_meal`, `clear_day_schedule`, `delete_custom_product`) block mutations when `confirm` or `confirmed` is omitted or false.

### Tier 3: Cross-Feature Integration Flows
Tests multi-step operations that pass state across subsystem boundaries:
- **Recipe & Inventory Synergy**:
  1. Add custom product (`Whey Isolate Vanille`, 380 kcal, 85g protein).
  2. Search catalog to verify product availability and metadata.
  3. Create recipe combining custom product and catalog staples (`lait_2_pourcent`, `banane`).
  4. Schedule recipe on Tuesday breakfast for Laurine.
  5. Verify `get_daily_plan` aggregates macros correctly.
  6. Generate `get_grocery_list` and verify ingredients populate appropriate aisles.
  7. Toggle pantry stock for milk, validating inventory reflection.
  8. Modify recipe servings and verify macro adaptation.
  9. Clean up with confirmed deletions.
- **Multi-Account Independence**:
  - Scheduling meals for Ethan does not bleed into Laurine's schedule.
  - Clearing Ethan's day leaves Laurine's day plan completely intact.

### Tier 4: Real-World Scenarios
Simulates authentic end-to-end user journeys:
- **Full-Week Meal Planning**: Populates a complete 7-day schedule (21 meals) across accounts, queries weekly plan (`day: 'all'`), and inspects grocery consolidation.
- **Store Price Adjustments & Dynamic Budgeting**: Overrides store prices for staple ingredients, verifying immediate reflection in recipe cost estimations and grocery list totals.
- **Confirmation Safety & Cancellation**: A user attempts a bulk schedule clear, reviews the warning, cancels (`confirm: false`), verifies zero mutation, and then confirms (`confirm: true`).

---

## 4. Feature Matrix & Traceability

| Feature ID | Feature Name | Tier | Primary Test Target |
|------------|--------------|------|----------------------|
| `F01` | `db_isolation` | All | `FOOD_PLANNER_DB_PATH` isolation & SHA256 integrity |
| `F02` | `macro_preservation` | T1, T3 | `saveCustomRecipe` preserves custom macros & overrides |
| `F03` | `ligature_normalization` | T2 | `normalizeText` (`œ` -> `oe`, `æ` -> `ae`) |
| `F04` | `day_slot_parser` | T2 | `parseDayIndex` & `parseMealSlot` bilingual aliases |
| `F05` | `search_normalization` | T1, T2 | Accent-insensitive & multi-word fuzzy matching |
| `F06` | `enum_tolerance` | T2 | Case/accent tolerance on aisles, units, meal types |
| `F07` | `set_product_preference` | T1 | Liked/disliked/neutral preference persistence |
| `F08` | `create_recipe` | T1, T3 | Smart catalog mapping, macro calculation, markdown |
| `F09` | `schedule_meal` | T1, T2, T3 | Bilingual day/slot scheduling, missing item suggestions |
| `F10` | `update_catalog_item_price` | T1, T2, T4 | Price override, non-negative validation, reset |
| `F11` | `add_custom_product` | T1, T2, T3 | Packaging, macros, amount default handling |
| `F12` | `get_daily_plan` | T1, T3, T4 | Daily & weekly macro summary generation |
| `F13` | `get_macro_status` | T1 | Daily target and budget status for accounts |
| `F14` | `get_grocery_list` | T1, T3, T4 | Aisle-grouped grocery list, taxes, savings |
| `F15` | `add_to_grocery_list` | T1 | Ad-hoc grocery item addition |
| `F16` | `get_pantry_items` | T1, T3 | In-stock inventory query and count |
| `F17` | `toggle_pantry_item` | T1, T3 | In-stock state toggling |
| `F18` | `search_recipes` | T1, T2, T3 | Keyword and tag-based recipe search |
| `F19` | `search_catalog` | T1, T2 | Multi-word fuzzy search in Metro catalog |
| `F20` | `delete_recipe` | T1, T2, T3 | Dual confirmation enforcement & recipe deletion |
| `F21` | `modify_recipe` | T1, T2, T3 | Dual confirmation, macro proration on servings change |
| `F22` | `remove_scheduled_meal` | T1, T2, T3 | Dual confirmation & single-slot removal |
| `F23` | `clear_day_schedule` | T1, T2, T4 | Dual confirmation & full-day schedule wipe |
| `F24` | `delete_custom_product` | T1, T2, T3 | Dual confirmation & custom product removal |
| `F25` | `mobile_formatting` | T1-T4 | Emoji-formatted markdown responses |
| `F26` | `test_infrastructure` | Harness | `npm test` runner with tier reporting |
| `F27` | `e2e_verification` | All | 100% pass across all 18 tools on isolated DB |

---

## 5. Pass / Fail Semantics

- **Assertion Failure**: Any assertion failure within any tier immediately marks the specific test as `FAIL`, records the diagnostic error stack, increments the failure counter, and aborts execution of that test.
- **Integrity Violation**: If the SHA-256 hash of `data/food_planner.sqlite` post-run differs from pre-run, the runner immediately halts with exit code `2` (Integrity Failure).
- **Process Exit Code**:
  - `0`: All test cases passed (100% success rate), production DB remained untouched, temporary DB cleanly unlinked.
  - `1`: One or more test assertions failed.
  - `2`: Database integrity or lock release failure.

---

## 6. Execution Command

Run the full automated test suite via npm:
```bash
npm test
```

Or execute directly with tsx:
```bash
npx tsx scripts/test-mcp-tools.ts
```
