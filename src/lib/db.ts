import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

import { UserCustomizationSettings, DEFAULT_USER_SETTINGS } from '@/types';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'food_planner.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Initialiser les tables
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
    `);
  }

  return dbInstance;
}

export interface PreferenceRow {
  ingredient_id: string;
  status: 'liked' | 'disliked' | 'neutral';
  updated_at: string;
}

export function getAllPreferences(): Record<string, 'liked' | 'disliked' | 'neutral'> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT ingredient_id, status FROM product_preferences');
  const rows = stmt.all() as unknown as PreferenceRow[];
  
  const map: Record<string, 'liked' | 'disliked' | 'neutral'> = {};
  for (const row of rows) {
    map[row.ingredient_id] = row.status;
  }
  return map;
}

export function setProductPreference(ingredientId: string, status: 'liked' | 'disliked' | 'neutral'): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  
  if (status === 'neutral') {
    const deleteStmt = db.prepare('DELETE FROM product_preferences WHERE ingredient_id = ?');
    deleteStmt.run(ingredientId);
  } else {
    const upsertStmt = db.prepare(`
      INSERT INTO product_preferences (ingredient_id, status, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(ingredient_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `);
    upsertStmt.run(ingredientId, status, now);
  }
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

// --- GESTION DES VARIABLES DE PERSONNALISATION (CALORIES, PROTÉINES, BUDGET) ---

export interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

export function getAppSettings(): UserCustomizationSettings {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value FROM app_settings');
  const rows = stmt.all() as unknown as SettingRow[];

  const settings: UserCustomizationSettings = { ...DEFAULT_USER_SETTINGS };

  for (const row of rows) {
    switch (row.key) {
      case 'targetCalories':
        settings.targetCalories = Number(row.value) || DEFAULT_USER_SETTINGS.targetCalories;
        break;
      case 'targetProtein':
        settings.targetProtein = Number(row.value) || DEFAULT_USER_SETTINGS.targetProtein;
        break;
      case 'targetCarbs':
        settings.targetCarbs = Number(row.value) || DEFAULT_USER_SETTINGS.targetCarbs;
        break;
      case 'targetFat':
        settings.targetFat = Number(row.value) || DEFAULT_USER_SETTINGS.targetFat;
        break;
      case 'targetWeeklyBudget':
        settings.targetWeeklyBudget = Number(row.value) || DEFAULT_USER_SETTINGS.targetWeeklyBudget;
        break;
      case 'partnerCalories':
        settings.partnerCalories = Number(row.value) || DEFAULT_USER_SETTINGS.partnerCalories;
        break;
      case 'partnerProtein':
        settings.partnerProtein = Number(row.value) || DEFAULT_USER_SETTINGS.partnerProtein;
        break;
      case 'goalName':
        settings.goalName = row.value || DEFAULT_USER_SETTINGS.goalName;
        break;
    }
  }

  return settings;
}

export function updateAppSettings(newSettings: Partial<UserCustomizationSettings>): UserCustomizationSettings {
  const db = getDatabase();
  const now = new Date().toISOString();

  const upsertStmt = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `);

  for (const [key, val] of Object.entries(newSettings)) {
    if (val !== undefined) {
      upsertStmt.run(key, String(val), now);
    }
  }

  return getAppSettings();
}
