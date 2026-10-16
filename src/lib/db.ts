import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

import { 
  UserCustomizationSettings, 
  DEFAULT_USER_SETTINGS, 
  DEFAULT_COPINE_SETTINGS, 
  UserAccount, 
  DEFAULT_ACCOUNTS 
} from '@/types';

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
    `);

    // Migration & Initialisation automatique des comptes Ethan et Copine
    try {
      const accountCountRow = dbInstance.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number } | undefined;
      const accountCount = accountCountRow?.count ?? 0;

      if (accountCount === 0) {
        const insertAccount = dbInstance.prepare('INSERT INTO accounts (id, name, avatar_initials, created_at) VALUES (?, ?, ?, ?)');
        const now = new Date().toISOString();
        insertAccount.run('ethan', 'Ethan', 'E', now);
        insertAccount.run('copine', 'Copine', 'C', now);
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

      // Initialiser les réglages pour Copine
      const copineSettingsCountRow = dbInstance.prepare("SELECT COUNT(*) as count FROM account_settings WHERE account_id = 'copine'").get() as { count: number } | undefined;
      if ((copineSettingsCountRow?.count ?? 0) === 0) {
        const now = new Date().toISOString();
        const upsertSetting = dbInstance.prepare(`
          INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)
        `);
        for (const [k, v] of Object.entries(DEFAULT_COPINE_SETTINGS)) {
          upsertSetting.run('copine', k, String(v), now);
        }
      }
    } catch (migErr) {
      console.warn('Note sur la migration accounts SQLite:', migErr);
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
  const stmt = db.prepare("SELECT id, name, avatar_initials FROM accounts ORDER BY CASE WHEN id = 'ethan' THEN 0 WHEN id = 'copine' THEN 1 ELSE 2 END, name ASC");
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
  for (const [k, v] of Object.entries(DEFAULT_COPINE_SETTINGS)) {
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

  const baseDefaults = accountId === 'copine' ? DEFAULT_COPINE_SETTINGS : DEFAULT_USER_SETTINGS;
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
