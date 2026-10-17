import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

import { 
  UserCustomizationSettings, 
  DEFAULT_USER_SETTINGS, 
  DEFAULT_LAURINE_SETTINGS,
  DEFAULT_COPINE_SETTINGS, 
  UserAccount, 
  DEFAULT_ACCOUNTS,
  Recipe,
  RecipeIngredientItem
} from '@/types';
import { INGREDIENTS } from '@/data/ingredients';
import { calculateRecipeNutrients } from './nutrition';
export { calculateRecipeNutrients };

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'food_planner.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Initialiser les tables principales
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS product_preferences (
        ingredient_id TEXT PRIMARY KEY,
        status TEXT NOT NULL CHECK(status IN ('liked', 'disliked', 'neutral')),
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aisle TEXT NOT NULL,
        package_description TEXT,
        price REAL NOT NULL,
        is_taxable INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_prices (
        ingredient_id TEXT PRIMARY KEY,
        custom_price REAL NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        avatar_initials TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS account_preferences (
        account_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('liked', 'disliked', 'neutral')),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_id, ingredient_id)
      );

      CREATE TABLE IF NOT EXISTS account_settings (
        account_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_id, key)
      );

      CREATE TABLE IF NOT EXISTS custom_recipes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('dejeuner', 'diner', 'souper', 'collation')),
        prep_time_minutes INTEGER NOT NULL DEFAULT 15,
        cook_time_minutes INTEGER NOT NULL DEFAULT 15,
        servings INTEGER NOT NULL DEFAULT 1,
        calories_per_serving REAL NOT NULL,
        protein_per_serving REAL NOT NULL,
        carbs_per_serving REAL NOT NULL,
        fat_per_serving REAL NOT NULL,
        ingredients_json TEXT NOT NULL,
        instructions_json TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        created_by TEXT NOT NULL DEFAULT 'ethan',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migration & Initialisation automatique des comptes Ethan et Laurine
    try {
      // 1. Migration automatique de copine -> laurine si des données existent déjà
      dbInstance.exec(`
        UPDATE accounts SET id = 'laurine', name = 'Laurine', avatar_initials = 'L' WHERE id = 'copine';
        UPDATE account_preferences SET account_id = 'laurine' WHERE account_id = 'copine';
        UPDATE account_settings SET account_id = 'laurine' WHERE account_id = 'copine';
        UPDATE app_settings SET value = 'laurine' WHERE key = 'active_account_id' AND value = 'copine';
      `);

      const accountCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number } | undefined;
      const accountCount = accountCountRow?.count ?? 0;

      if (accountCount === 0) {
        const insertAccount = dbInstance.prepare('INSERT INTO accounts (id, name, avatar_initials, created_at) VALUES (?, ?, ?, ?)');
        const now = new Date().toISOString();
        insertAccount.run('ethan', 'Ethan', 'E', now);
        insertAccount.run('laurine', 'Laurine', 'L', now);
      }

      // Migrer les préférences existantes de product_preferences vers account_preferences pour Ethan
      const ethanPrefCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM account_preferences WHERE account_id = 'ethan'").get() as { count: number } | undefined;
      if ((ethanPrefCountRow?.count ?? 0) === 0) {
        dbInstance.exec(`
          INSERT OR IGNORE INTO account_preferences (account_id, ingredient_id, status, updated_at)
          SELECT 'ethan', ingredient_id, status, updated_at FROM product_preferences;
        `);
      }

      // Migrer les réglages existants pour Ethan
      const ethanSettingsCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM account_settings WHERE account_id = 'ethan'").get() as { count: number } | undefined;
      if ((ethanSettingsCountRow?.count ?? 0) === 0) {
        dbInstance.exec(`
          INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at)
          SELECT 'ethan', key, value, updated_at FROM app_settings;
        `);
        const now = new Date().toISOString();
        const upsertSetting = dbInstance.prepare(`
          INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)
        `);
        for (const [k, v] of Object.entries(DEFAULT_USER_SETTINGS)) {
          upsertSetting.run('ethan', k, String(v), now);
        }
      }

      // Initialiser les réglages pour Laurine
      const laurineSettingsCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM account_settings WHERE account_id = 'laurine'").get() as { count: number } | undefined;
      if ((laurineSettingsCountRow?.count ?? 0) === 0) {
        const now = new Date().toISOString();
        const upsertSetting = dbInstance.prepare(`
          INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)
        `);
        for (const [k, v] of Object.entries(DEFAULT_LAURINE_SETTINGS)) {
          upsertSetting.run('laurine', k, String(v), now);
        }
      }

      // 2. Initialiser la recette personnalisée exemple si la table custom_recipes est vide
      const customRecipeCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM custom_recipes').get() as { count: number } | undefined;
      if ((customRecipeCountRow?.count ?? 0) === 0) {
        const seedIngredients: RecipeIngredientItem[] = [
          { ingredientId: 'pates_penne', quantity: 200, unit: 'g', notes: 'Penne ou Rigatoni Barilla' },
          { ingredientId: 'champignons_blancs', quantity: 200, unit: 'g', notes: 'Émincés et dorés à la poêle' },
          { ingredientId: 'lardons_bacon', quantity: 150, unit: 'g', notes: 'Lardons fumés québécois croustillants' },
          { ingredientId: 'creme_15', quantity: 150, unit: 'ml', notes: 'Crème à cuisson 15% Québon' },
          { ingredientId: 'parmesan_rape', quantity: 30, unit: 'g', notes: 'Parmesan râpé à incorporer en fin de cuisson' },
        ];
        const seedInstructions = [
          'Faire bouillir une grande casserole d\'eau salée et cuire les pâtes al dente selon les instructions.',
          'Dans une poêle chaude, faire dorer les lardons à feu vif jusqu\'à ce qu\'ils soient dorés et croustillants.',
          'Ajouter les champignons émincés dans la poêle et les faire revenir 4 à 5 minutes avec les sucs des lardons.',
          'Verser la crème à cuisson 15%, mélanger et laisser mijoter à feu doux 2 minutes pour épaissir la sauce.',
          'Égoutter les pâtes, les incorporer directement dans la sauce chaude, puis saupoudrer de parmesan râpé.',
          'Poivrer généreusement et servir chaud.'
        ];
        const nutrients = calculateRecipeNutrients(seedIngredients, 2);
        const now = new Date().toISOString();
        const insertSeed = dbInstance.prepare(`
          INSERT INTO custom_recipes (
            id, title, meal_type, prep_time_minutes, cook_time_minutes, servings,
            calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving,
            ingredients_json, instructions_json, tags_json, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        insertSeed.run(
          'custom_pates_champignons_creme_lardons',
          'Pâtes aux champignons, crème & lardons québécois',
          'souper',
          10,
          15,
          2,
          nutrients.caloriesPerServing,
          nutrients.proteinPerServing,
          nutrients.carbsPerServing,
          nutrients.fatPerServing,
          JSON.stringify(seedIngredients),
          JSON.stringify(seedInstructions),
          JSON.stringify(['fait-maison', 'pâtes', 'réconfortant', 'italien-québécois', 'rapide']),
          'ethan',
          now,
          now
        );
      }
    } catch (migErr) {
      console.warn('Note sur l\'initialisation SQLite:', migErr);
    }
  }

  return dbInstance;
}

// --- GESTION DES COMPTES (ETHAN, COPINE, ETC.) ---

export interface AccountRow {
  id: string;
  name: string;
  avatar_initials: string;
  created_at: string;
}

export function getAllAccounts(): UserAccount[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, name, avatar_initials FROM accounts ORDER BY CASE WHEN id = 'ethan' THEN 0 WHEN id = 'laurine' THEN 1 ELSE 2 END, name ASC");
  const rows = stmt.all() as unknown as AccountRow[];

  if (rows.length === 0) {
    return DEFAULT_ACCOUNTS;
  }

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    avatarInitials: r.avatar_initials || r.name.substring(0, 1).toUpperCase(),
    isDefault: r.id === 'ethan',
  }));
}

export function createAccount(id: string, name: string): UserAccount {
  const db = getDatabase();
  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `user_${Date.now()}`;
  const cleanName = name.trim() || 'Nouveau Profil';
  const initials = cleanName.substring(0, 2).toUpperCase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, avatar_initials, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_initials = excluded.avatar_initials
  `);
  stmt.run(cleanId, cleanName, initials, now);

  // Initialiser les réglages de ce nouveau compte
  const upsertSetting = db.prepare(`
    INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)
  `);
  for (const [k, v] of Object.entries(DEFAULT_LAURINE_SETTINGS)) {
    upsertSetting.run(cleanId, k, String(v), now);
  }

  return {
    id: cleanId,
    name: cleanName,
    avatarInitials: initials,
  };
}

export function renameAccount(id: string, newName: string): void {
  const db = getDatabase();
  const cleanName = newName.trim();
  if (!cleanName) return;
  const initials = cleanName.substring(0, 2).toUpperCase();

  const stmt = db.prepare('UPDATE accounts SET name = ?, avatar_initials = ? WHERE id = ?');
  stmt.run(cleanName, initials, id);
}

export function getActiveAccountId(): string {
  const db = getDatabase();
  const stmt = db.prepare("SELECT value FROM app_settings WHERE key = 'active_account_id'");
  const row = stmt.get() as { value: string } | undefined;
  return row?.value || 'ethan';
}

export function setActiveAccountId(id: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('active_account_id', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  stmt.run(id, now);
}

// --- GESTION DES PRÉFÉRENCES PAR COMPTE ---

export interface PreferenceRow {
  ingredient_id: string;
  status: 'liked' | 'disliked' | 'neutral';
  updated_at: string;
}

export function getPreferencesForAccount(accountId = 'ethan'): Record<string, 'liked' | 'disliked' | 'neutral'> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT ingredient_id, status FROM account_preferences WHERE account_id = ?');
  const rows = stmt.all(accountId) as unknown as PreferenceRow[];

  const map: Record<string, 'liked' | 'disliked' | 'neutral'> = {};
  for (const row of rows) {
    map[row.ingredient_id] = row.status;
  }
  return map;
}

export function getAllAccountsPreferences(): Record<string, Record<string, 'liked' | 'disliked' | 'neutral'>> {
  const accounts = getAllAccounts();
  const result: Record<string, Record<string, 'liked' | 'disliked' | 'neutral'>> = {};
  for (const acc of accounts) {
    result[acc.id] = getPreferencesForAccount(acc.id);
  }
  return result;
}

export function setAccountPreference(
  accountId: string,
  ingredientId: string,
  status: 'liked' | 'disliked' | 'neutral'
): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (status === 'neutral') {
    const deleteStmt = db.prepare('DELETE FROM account_preferences WHERE account_id = ? AND ingredient_id = ?');
    deleteStmt.run(accountId, ingredientId);
  } else {
    const upsertStmt = db.prepare(`
      INSERT INTO account_preferences (account_id, ingredient_id, status, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, ingredient_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `);
    upsertStmt.run(accountId, ingredientId, status, now);
  }

  // Si c'est Ethan, garder la table product_preferences synchronisée
  if (accountId === 'ethan') {
    if (status === 'neutral') {
      db.prepare('DELETE FROM product_preferences WHERE ingredient_id = ?').run(ingredientId);
    } else {
      db.prepare(`
        INSERT INTO product_preferences (ingredient_id, status, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(ingredient_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
      `).run(ingredientId, status, now);
    }
  }
}

// Fonctions rétrocompatibles
export function getAllPreferences(): Record<string, 'liked' | 'disliked' | 'neutral'> {
  return getPreferencesForAccount('ethan');
}

export function setProductPreference(ingredientId: string, status: 'liked' | 'disliked' | 'neutral'): void {
  setAccountPreference('ethan', ingredientId, status);
}

// --- GESTION DES PRIX PERSONNALISÉS (PRIX D'ÉPICERIE DÉFINIS PAR L'UTILISATEUR) ---

export interface CustomPriceRow {
  ingredient_id: string;
  custom_price: number;
  updated_at: string;
}

export function getAllCustomPrices(): Record<string, number> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT ingredient_id, custom_price FROM custom_prices');
  const rows = stmt.all() as unknown as CustomPriceRow[];

  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.ingredient_id] = Number(row.custom_price);
  }
  return map;
}

export function setCustomPrice(ingredientId: string, customPrice: number | null): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  if (customPrice === null || customPrice <= 0) {
    const deleteStmt = db.prepare('DELETE FROM custom_prices WHERE ingredient_id = ?');
    deleteStmt.run(ingredientId);
  } else {
    const upsertStmt = db.prepare(`
      INSERT INTO custom_prices (ingredient_id, custom_price, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(ingredient_id) DO UPDATE SET
        custom_price = excluded.custom_price,
        updated_at = excluded.updated_at
    `);
    upsertStmt.run(ingredientId, customPrice, now);
  }
}

// --- GESTION DES VARIABLES DE PERSONNALISATION PAR COMPTE ---

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export function getSettingsForAccount(accountId = 'ethan'): UserCustomizationSettings {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value FROM account_settings WHERE account_id = ?');
  const rows = stmt.all(accountId) as unknown as SettingRow[];

  const baseDefaults = (accountId === 'laurine' || accountId === 'copine') ? DEFAULT_LAURINE_SETTINGS : DEFAULT_USER_SETTINGS;
  const settings: UserCustomizationSettings = { ...baseDefaults };

  for (const row of rows) {
    switch (row.key) {
      case 'targetCalories':
        settings.targetCalories = Number(row.value) || baseDefaults.targetCalories;
        break;
      case 'targetProtein':
        settings.targetProtein = Number(row.value) || baseDefaults.targetProtein;
        break;
      case 'targetCarbs':
        settings.targetCarbs = Number(row.value) || baseDefaults.targetCarbs;
        break;
      case 'targetFat':
        settings.targetFat = Number(row.value) || baseDefaults.targetFat;
        break;
      case 'targetWeeklyBudget':
        settings.targetWeeklyBudget = Number(row.value) || baseDefaults.targetWeeklyBudget;
        break;
      case 'partnerCalories':
        settings.partnerCalories = Number(row.value) || baseDefaults.partnerCalories;
        break;
      case 'partnerProtein':
        settings.partnerProtein = Number(row.value) || baseDefaults.partnerProtein;
        break;
      case 'goalName':
        settings.goalName = row.value || baseDefaults.goalName;
        break;
    }
  }

  return settings;
}

export function getAllAccountsSettings(): Record<string, UserCustomizationSettings> {
  const accounts = getAllAccounts();
  const result: Record<string, UserCustomizationSettings> = {};
  for (const acc of accounts) {
    result[acc.id] = getSettingsForAccount(acc.id);
  }
  return result;
}

export function updateAccountSettings(
  accountId: string,
  newSettings: Partial<UserCustomizationSettings>
): UserCustomizationSettings {
  const db = getDatabase();
  const now = new Date().toISOString();

  const upsertStmt = db.prepare(`
    INSERT INTO account_settings (account_id, key, value, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(account_id, key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  for (const [key, val] of Object.entries(newSettings)) {
    if (val !== undefined) {
      upsertStmt.run(accountId, key, String(val), now);
    }
  }

  // Rétrocompatibilité avec app_settings pour Ethan
  if (accountId === 'ethan') {
    const appUpsert = db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    for (const [key, val] of Object.entries(newSettings)) {
      if (val !== undefined) {
        appUpsert.run(key, String(val), now);
      }
    }
  }

  return getSettingsForAccount(accountId);
}

// Fonctions rétrocompatibles
export function getAppSettings(): UserCustomizationSettings {
  return getSettingsForAccount('ethan');
}

export function updateAppSettings(newSettings: Partial<UserCustomizationSettings>): UserCustomizationSettings {
  return updateAccountSettings('ethan', newSettings);
}

// --- GESTION DES RECETTES ET REPAS PERSONNALISÉS (SQLITE) ---

export interface CustomRecipeRow {
  id: string;
  title: string;
  meal_type: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  ingredients_json: string;
  instructions_json: string;
  tags_json: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function getAllCustomRecipes(): Recipe[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM custom_recipes ORDER BY updated_at DESC');
  const rows = stmt.all() as unknown as CustomRecipeRow[];

  return rows.map((r) => {
    let ingredients: RecipeIngredientItem[] = [];
    let instructions: string[] = [];
    let tags: string[] = [];

    try {
      ingredients = JSON.parse(r.ingredients_json || '[]');
    } catch {
      ingredients = [];
    }
    try {
      instructions = JSON.parse(r.instructions_json || '[]');
    } catch {
      instructions = [];
    }
    try {
      tags = JSON.parse(r.tags_json || '[]');
    } catch {
      tags = [];
    }

    return {
      id: r.id,
      title: r.title,
      mealType: r.meal_type as 'dejeuner' | 'diner' | 'souper' | 'collation',
      prepTimeMinutes: Number(r.prep_time_minutes) || 15,
      cookTimeMinutes: Number(r.cook_time_minutes) || 15,
      servings: Number(r.servings) || 1,
      caloriesPerServing: Math.round(Number(r.calories_per_serving) || 0),
      proteinPerServing: Math.round((Number(r.protein_per_serving) || 0) * 10) / 10,
      carbsPerServing: Math.round((Number(r.carbs_per_serving) || 0) * 10) / 10,
      fatPerServing: Math.round((Number(r.fat_per_serving) || 0) * 10) / 10,
      ingredients,
      instructions,
      tags,
      isCustom: true,
      createdBy: r.created_by,
      updatedAt: r.updated_at,
    };
  });
}

export function getCustomRecipeById(id: string): Recipe | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM custom_recipes WHERE id = ?');
  const r = stmt.get(id) as unknown as CustomRecipeRow | undefined;
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    mealType: r.meal_type as 'dejeuner' | 'diner' | 'souper' | 'collation',
    prepTimeMinutes: Number(r.prep_time_minutes) || 15,
    cookTimeMinutes: Number(r.cook_time_minutes) || 15,
    servings: Number(r.servings) || 1,
    caloriesPerServing: Math.round(Number(r.calories_per_serving) || 0),
    proteinPerServing: Math.round((Number(r.protein_per_serving) || 0) * 10) / 10,
    carbsPerServing: Math.round((Number(r.carbs_per_serving) || 0) * 10) / 10,
    fatPerServing: Math.round((Number(r.fat_per_serving) || 0) * 10) / 10,
    ingredients: JSON.parse(r.ingredients_json || '[]'),
    instructions: JSON.parse(r.instructions_json || '[]'),
    tags: JSON.parse(r.tags_json || '[]'),
    isCustom: true,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
  };
}

export function saveCustomRecipe(recipeData: Partial<Recipe>): Recipe {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = recipeData.id || `custom_recipe_${Date.now()}`;
  const title = (recipeData.title || 'Recette Maison').trim();
  const mealType = recipeData.mealType || 'souper';
  const prepTime = Number(recipeData.prepTimeMinutes) || 15;
  const cookTime = Number(recipeData.cookTimeMinutes) || 15;
  const servings = Math.max(1, Number(recipeData.servings) || 1);
  const ingredients = recipeData.ingredients || [];
  const instructions = recipeData.instructions || [];
  const tags = recipeData.tags || ['fait-maison'];
  const createdBy = recipeData.createdBy || 'ethan';

  // Calcul automatique précis des macros à partir des ingrédients de la BD
  const nutrients = calculateRecipeNutrients(ingredients, servings);

  const stmt = db.prepare(`
    INSERT INTO custom_recipes (
      id, title, meal_type, prep_time_minutes, cook_time_minutes, servings,
      calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving,
      ingredients_json, instructions_json, tags_json, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      meal_type = excluded.meal_type,
      prep_time_minutes = excluded.prep_time_minutes,
      cook_time_minutes = excluded.cook_time_minutes,
      servings = excluded.servings,
      calories_per_serving = excluded.calories_per_serving,
      protein_per_serving = excluded.protein_per_serving,
      carbs_per_serving = excluded.carbs_per_serving,
      fat_per_serving = excluded.fat_per_serving,
      ingredients_json = excluded.ingredients_json,
      instructions_json = excluded.instructions_json,
      tags_json = excluded.tags_json,
      updated_at = excluded.updated_at
  `);

  stmt.run(
    id,
    title,
    mealType,
    prepTime,
    cookTime,
    servings,
    nutrients.caloriesPerServing,
    nutrients.proteinPerServing,
    nutrients.carbsPerServing,
    nutrients.fatPerServing,
    JSON.stringify(ingredients),
    JSON.stringify(instructions),
    JSON.stringify(tags),
    createdBy,
    now,
    now
  );

  return {
    id,
    title,
    mealType,
    prepTimeMinutes: prepTime,
    cookTimeMinutes: cookTime,
    servings,
    caloriesPerServing: nutrients.caloriesPerServing,
    proteinPerServing: nutrients.proteinPerServing,
    carbsPerServing: nutrients.carbsPerServing,
    fatPerServing: nutrients.fatPerServing,
    ingredients,
    instructions,
    tags,
    isCustom: true,
    createdBy,
    updatedAt: now,
  };
}

export function deleteCustomRecipe(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM custom_recipes WHERE id = ?');
  const res = stmt.run(id);
  return (res as unknown as { changes: number }).changes > 0;
}

