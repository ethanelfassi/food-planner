import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

import { 
  UserCustomizationSettings, 
  DEFAULT_USER_SETTINGS, 
  DEFAULT_LAURINE_SETTINGS,
  UserAccount, 
  DEFAULT_ACCOUNTS,
  Friendship,
  SharedGroceryGroup,
  Recipe,
  RecipeIngredientItem,
  Ingredient,
  GroceryItem,
  DatabaseBackup
} from '@/types';
import { calculateRecipeNutrients } from './nutrition';
export { calculateRecipeNutrients };

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedBuffer = scryptSync(password, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return timingSafeEqual(keyBuffer, derivedBuffer);
}

export function generateFriendCode(prefix = 'FP'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${code}`;
}

export function getDbPath(): string {
  if (process.env.FOOD_PLANNER_DB_PATH) {
    return process.env.FOOD_PLANNER_DB_PATH;
  }
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const DB_DIR = path.join(process.cwd(), 'data');
  return path.join(DB_DIR, 'food_planner.sqlite');
}

export function resetDatabaseInstance(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignorer l'erreur à la fermeture
    }
    dbInstance = null;
  }
}

export const closeDatabase = resetDatabaseInstance;

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const targetPath = getDbPath();
    if (targetPath !== ':memory:') {
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
    }

    dbInstance = new DatabaseSync(targetPath);

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

      CREATE TABLE IF NOT EXISTS pantry_items (
        ingredient_id TEXT PRIMARY KEY,
        in_stock INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_grocery_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        aisle TEXT NOT NULL,
        package_description TEXT NOT NULL,
        price REAL NOT NULL,
        is_taxable INTEGER NOT NULL DEFAULT 0,
        for_account TEXT NOT NULL DEFAULT 'common',
        checked INTEGER NOT NULL DEFAULT 0,
        ingredient_id TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS scheduled_meals (
        account_id TEXT NOT NULL,
        day_index INTEGER NOT NULL CHECK(day_index >= 0 AND day_index <= 6),
        meal_slot TEXT NOT NULL CHECK(meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
        recipe_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_id, day_index, meal_slot)
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS friendships (
        id TEXT PRIMARY KEY,
        requester_id TEXT NOT NULL,
        addressee_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'declined')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(requester_id, addressee_id)
      );

      CREATE TABLE IF NOT EXISTS shared_grocery_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_by TEXT NOT NULL,
        member_ids_json TEXT NOT NULL,
        checked_items_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS account_pantry_items (
        account_id TEXT NOT NULL,
        ingredient_id TEXT NOT NULL,
        in_stock INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (account_id, ingredient_id)
      );
    `);

    // Migration accounts pour supporter authentification & système d'amis
    const accountCols = [
      "ALTER TABLE accounts ADD COLUMN username TEXT",
      "ALTER TABLE accounts ADD COLUMN email TEXT",
      "ALTER TABLE accounts ADD COLUMN password_hash TEXT",
      "ALTER TABLE accounts ADD COLUMN friend_code TEXT",
    ];
    for (const colSql of accountCols) {
      try {
        dbInstance.exec(colSql);
      } catch {
        // Ignorer si la colonne existe déjà
      }
    }

    // Migration custom_products pour supporter code-barres, photos, macros et poids
    const customProductCols = [
      "ALTER TABLE custom_products ADD COLUMN barcode TEXT",
      "ALTER TABLE custom_products ADD COLUMN image_url TEXT",
      "ALTER TABLE custom_products ADD COLUMN calories_per_100g REAL DEFAULT 0",
      "ALTER TABLE custom_products ADD COLUMN protein_per_100g REAL DEFAULT 0",
      "ALTER TABLE custom_products ADD COLUMN carbs_per_100g REAL DEFAULT 0",
      "ALTER TABLE custom_products ADD COLUMN fat_per_100g REAL DEFAULT 0",
      "ALTER TABLE custom_products ADD COLUMN amount REAL DEFAULT 100",
      "ALTER TABLE custom_products ADD COLUMN unit TEXT DEFAULT 'g'",
      "ALTER TABLE custom_products ADD COLUMN metro_url TEXT",
      "ALTER TABLE custom_products ADD COLUMN created_by TEXT DEFAULT 'ethan'",
    ];
    for (const colSql of customProductCols) {
      try {
        dbInstance.exec(colSql);
      } catch {
        // Ignorer si la colonne existe déjà
      }
    }

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

      // Assurer que les comptes existants (Ethan, Laurine, etc.) ont un username, un friend_code et un mot de passe par défaut
      const existingAccounts = dbInstance.prepare('SELECT id, name, username, email, password_hash, friend_code FROM accounts').all() as {
        id: string;
        name: string;
        username?: string;
        email?: string;
        password_hash?: string;
        friend_code?: string;
      }[];

      const updateAccAuth = dbInstance.prepare(`
        UPDATE accounts SET username = ?, email = ?, password_hash = ?, friend_code = ? WHERE id = ?
      `);

      for (const acc of existingAccounts) {
        const defaultUsername = acc.username || acc.id.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const defaultEmail = acc.email || `${defaultUsername}@foodplanner.local`;
        const defaultCode = acc.friend_code || (acc.id === 'ethan' ? 'FP-ETHAN' : acc.id === 'laurine' ? 'FP-LAURINE' : generateFriendCode());
        const defaultPass = acc.password_hash || hashPassword(acc.id === 'laurine' ? 'laurine123' : `${defaultUsername}123`);
        if (!acc.username || !acc.friend_code || !acc.password_hash) {
          updateAccAuth.run(defaultUsername, defaultEmail, defaultPass, defaultCode, acc.id);
        }
      }

      // Créer l'amitié par défaut entre Ethan et Laurine s'ils existent
      const friendshipRow = dbInstance.prepare(
        "SELECT id FROM friendships WHERE (requester_id = 'ethan' AND addressee_id = 'laurine') OR (requester_id = 'laurine' AND addressee_id = 'ethan')"
      ).get() as { id: string } | undefined;

      if (!friendshipRow) {
        const now = new Date().toISOString();
        dbInstance.prepare(`
          INSERT OR IGNORE INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
          VALUES ('friend_ethan_laurine', 'ethan', 'laurine', 'accepted', ?, ?)
        `).run(now, now);
      }

      // Créer le groupe de course jointe par défaut entre Ethan et Laurine
      const jointGroupRow = dbInstance.prepare(
        "SELECT id FROM shared_grocery_groups WHERE id = 'joint_ethan_laurine'"
      ).get() as { id: string } | undefined;

      if (!jointGroupRow) {
        const now = new Date().toISOString();
        dbInstance.prepare(`
          INSERT OR IGNORE INTO shared_grocery_groups (id, name, created_by, member_ids_json, checked_items_json, created_at, updated_at)
          VALUES ('joint_ethan_laurine', 'Course jointe Ethan & Laurine', 'ethan', '["ethan","laurine"]', '{}', ?, ?)
        `).run(now, now);
      }

      // Migrer pantry_items vers account_pantry_items pour Ethan
      const ethanPantryCount = dbInstance.prepare("SELECT COUNT(*) as count FROM account_pantry_items WHERE account_id = 'ethan'").get() as { count: number } | undefined;
      if ((ethanPantryCount?.count ?? 0) === 0) {
        dbInstance.exec(`
          INSERT OR IGNORE INTO account_pantry_items (account_id, ingredient_id, in_stock, updated_at)
          SELECT 'ethan', ingredient_id, in_stock, updated_at FROM pantry_items;
        `);
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
    } catch (migErr) {
      console.warn('Note sur l\'initialisation SQLite:', migErr);
    }
  }

  return dbInstance;
}

// --- GESTION DES COMPTES, AUTHENTIFICATION & AMIS ---

export interface AccountRow {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password_hash?: string;
  friend_code?: string;
  avatar_initials: string;
  created_at: string;
}

function mapAccountRowToUserAccount(r: AccountRow): UserAccount {
  return {
    id: r.id,
    name: r.name,
    username: r.username || r.id,
    email: r.email || undefined,
    friendCode: r.friend_code || undefined,
    avatarInitials: r.avatar_initials || r.name.substring(0, 1).toUpperCase(),
    isDefault: r.id === 'ethan',
  };
}

export function getAllAccounts(): UserAccount[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT id, name, username, email, friend_code, avatar_initials, created_at FROM accounts ORDER BY CASE WHEN id = 'ethan' THEN 0 WHEN id = 'laurine' THEN 1 ELSE 2 END, name ASC");
  const rows = stmt.all() as unknown as AccountRow[];

  if (rows.length === 0) {
    return DEFAULT_ACCOUNTS;
  }

  return rows.map(mapAccountRowToUserAccount);
}

export function getAccountById(accountId: string): UserAccount | null {
  const db = getDatabase();
  const row = db.prepare('SELECT id, name, username, email, friend_code, avatar_initials, created_at FROM accounts WHERE id = ?').get(accountId) as unknown as AccountRow | undefined;
  return row ? mapAccountRowToUserAccount(row) : null;
}

export function createAccount(id: string, name: string): UserAccount {
  const db = getDatabase();
  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `user_${Date.now()}`;
  const cleanName = name.trim() || 'Nouveau Profil';
  const initials = cleanName.substring(0, 2).toUpperCase();
  const now = new Date().toISOString();
  const friendCode = generateFriendCode();
  const passwordHash = hashPassword(`${cleanId}123`);

  const stmt = db.prepare(`
    INSERT INTO accounts (id, name, username, email, password_hash, friend_code, avatar_initials, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_initials = excluded.avatar_initials
  `);
  stmt.run(cleanId, cleanName, cleanId, `${cleanId}@foodplanner.local`, passwordHash, friendCode, initials, now);

  // Initialiser les réglages de ce nouveau compte
  const upsertSetting = db.prepare(`
    INSERT OR IGNORE INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?)
  `);
  for (const [k, v] of Object.entries(DEFAULT_LAURINE_SETTINGS)) {
    upsertSetting.run(cleanId, k, String(v), now);
  }

  return getAccountById(cleanId) || {
    id: cleanId,
    name: cleanName,
    username: cleanId,
    friendCode,
    avatarInitials: initials,
  };
}

export function registerUserAccount(params: {
  username: string;
  name: string;
  email?: string;
  password: string;
  settings?: Partial<UserCustomizationSettings>;
  inviteCode?: string;
}): { user: UserAccount; token: string } {
  const db = getDatabase();
  const cleanUsername = params.username.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.-]/g, '');
  if (!cleanUsername || cleanUsername.length < 2) {
    throw new Error('Le pseudo doit contenir au moins 2 caractères alphanumériques.');
  }
  if (!params.password || params.password.length < 4) {
    throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
  }

  const existing = db.prepare('SELECT id FROM accounts WHERE LOWER(username) = ? OR LOWER(id) = ?').get(cleanUsername, cleanUsername) as { id: string } | undefined;
  if (existing) {
    throw new Error(`Le pseudo @${cleanUsername} est déjà utilisé.`);
  }

  if (params.email) {
    const cleanEmail = params.email.trim().toLowerCase();
    const existingEmail = db.prepare('SELECT id FROM accounts WHERE LOWER(email) = ?').get(cleanEmail) as { id: string } | undefined;
    if (existingEmail) {
      throw new Error('Cette adresse courriel est déjà associée à un compte.');
    }
  }

  const id = cleanUsername;
  const displayName = (params.name || cleanUsername).trim();
  const initials = displayName.substring(0, 2).toUpperCase();
  const email = (params.email || `${cleanUsername}@foodplanner.app`).trim().toLowerCase();
  const passwordHash = hashPassword(params.password);
  const friendCode = generateFriendCode();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO accounts (id, name, username, email, password_hash, friend_code, avatar_initials, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, displayName, cleanUsername, email, passwordHash, friendCode, initials, now);

  const initialSettings: UserCustomizationSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...(params.settings || {}),
  };
  updateAccountSettings(id, initialSettings);

  // Si un code d'invitation ami a été fourni à l'inscription, créer et accepter l'amitié directement !
  if (params.inviteCode && params.inviteCode.trim()) {
    try {
      const cleanInvite = params.inviteCode.trim();
      const inviter = db.prepare(
        'SELECT id, name FROM accounts WHERE UPPER(friend_code) = UPPER(?) OR LOWER(username) = LOWER(?) OR LOWER(id) = LOWER(?)'
      ).get(cleanInvite, cleanInvite.replace(/^@/, ''), cleanInvite.replace(/^@/, '')) as { id: string; name: string } | undefined;

      if (inviter && inviter.id !== id) {
        const friendshipId = `friend_${inviter.id}_${id}`;
        db.prepare(`
          INSERT OR IGNORE INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
          VALUES (?, ?, ?, 'accepted', ?, ?)
        `).run(friendshipId, inviter.id, id, now, now);
      }
    } catch {
      // Ignorer si le code d'invitation est invalide
    }
  }

  const user = getAccountById(id)!;
  const token = createSession(id);
  return { user, token };
}

export function authenticateUser(identifier: string, password: string): { user: UserAccount; token: string } {
  const db = getDatabase();
  const cleanIdent = identifier.trim().toLowerCase().replace(/^@/, '');
  const row = db.prepare(
    'SELECT id, name, username, email, password_hash, friend_code, avatar_initials, created_at FROM accounts WHERE LOWER(username) = ? OR LOWER(email) = ? OR LOWER(id) = ?'
  ).get(cleanIdent, cleanIdent, cleanIdent) as unknown as AccountRow | undefined;

  if (!row) {
    throw new Error('Compte introuvable. Vérifiez votre pseudo ou courriel.');
  }

  if (row.password_hash && !verifyPassword(password, row.password_hash)) {
    throw new Error('Mot de passe incorrect.');
  }

  const user = mapAccountRowToUserAccount(row);
  const token = createSession(user.id);
  setActiveAccountId(user.id);
  return { user, token };
}

export function createSession(accountId: string): string {
  const db = getDatabase();
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 jours

  db.prepare(`
    INSERT INTO auth_sessions (token, account_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, accountId, now.toISOString(), expires.toISOString());

  return token;
}

export function getAccountBySessionToken(token?: string | null): UserAccount | null {
  if (!token) return null;
  const db = getDatabase();
  const row = db.prepare(`
    SELECT s.account_id, s.expires_at
    FROM auth_sessions s
    WHERE s.token = ?
  `).get(token) as { account_id: string; expires_at: string } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
    return null;
  }

  return getAccountById(row.account_id);
}

export function deleteSession(token?: string | null): void {
  if (!token) return;
  const db = getDatabase();
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(token);
}

export function changeAccountPassword(accountId: string, newPassword: string): void {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('Le nouveau mot de passe doit contenir au moins 4 caractères.');
  }
  const db = getDatabase();
  const hash = hashPassword(newPassword);
  db.prepare('UPDATE accounts SET password_hash = ? WHERE id = ?').run(hash, accountId);
}

// --- SYSTÈME D'AMIS (RECHERCHE PAR PSEUDO OU CODE D'INVITATION) ---

export function getFriendsAndRequests(accountId: string): {
  friends: UserAccount[];
  incomingRequests: Friendship[];
  outgoingRequests: Friendship[];
  allFriendships: Friendship[];
} {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT id, requester_id, addressee_id, status, created_at, updated_at
    FROM friendships
    WHERE requester_id = ? OR addressee_id = ?
    ORDER BY updated_at DESC
  `).all(accountId, accountId) as {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
  }[];

  const friends: UserAccount[] = [];
  const incomingRequests: Friendship[] = [];
  const outgoingRequests: Friendship[] = [];
  const allFriendships: Friendship[] = [];

  for (const r of rows) {
    if (r.status === 'declined') continue;
    const otherId = r.requester_id === accountId ? r.addressee_id : r.requester_id;
    const otherUser = getAccountById(otherId);
    if (!otherUser) continue;

    const direction: 'incoming' | 'outgoing' | 'accepted' =
      r.status === 'accepted'
        ? 'accepted'
        : r.addressee_id === accountId
        ? 'incoming'
        : 'outgoing';

    const f: Friendship = {
      id: r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      friend: otherUser,
      direction,
    };

    allFriendships.push(f);
    if (r.status === 'accepted') {
      friends.push(otherUser);
    } else if (direction === 'incoming') {
      incomingRequests.push(f);
    } else {
      outgoingRequests.push(f);
    }
  }

  return { friends, incomingRequests, outgoingRequests, allFriendships };
}

export function sendFriendRequest(requesterId: string, targetIdentifier: string): {
  friendship: Friendship;
  autoAccepted: boolean;
  message: string;
} {
  const db = getDatabase();
  const cleanTarget = targetIdentifier.trim().replace(/^@/, '');
  if (!cleanTarget) {
    throw new Error('Veuillez entrer un @pseudo ou un Code Ami (ex: FP-XXXX).');
  }

  const targetRow = db.prepare(`
    SELECT id, name, username, email, friend_code, avatar_initials, created_at
    FROM accounts
    WHERE UPPER(friend_code) = UPPER(?) OR LOWER(username) = LOWER(?) OR LOWER(id) = LOWER(?) OR LOWER(email) = LOWER(?)
  `).get(cleanTarget, cleanTarget, cleanTarget, cleanTarget) as unknown as AccountRow | undefined;

  if (!targetRow) {
    throw new Error(`Aucun utilisateur trouvé avec "${targetIdentifier}".`);
  }

  if (targetRow.id === requesterId) {
    throw new Error('Vous ne pouvez pas vous ajouter vous-même en ami.');
  }

  const targetUser = mapAccountRowToUserAccount(targetRow);
  const matchedByFriendCode = Boolean(
    targetRow.friend_code && targetRow.friend_code.toUpperCase() === cleanTarget.toUpperCase()
  );

  // Vérifier s'il existe déjà une relation dans un sens ou dans l'autre
  const existing = db.prepare(`
    SELECT id, requester_id, addressee_id, status, created_at, updated_at
    FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).get(requesterId, targetUser.id, targetUser.id, requesterId) as {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
    updated_at: string;
  } | undefined;

  const now = new Date().toISOString();

  if (existing) {
    if (existing.status === 'accepted') {
      throw new Error(`Vous êtes déjà ami avec ${targetUser.name} (@${targetUser.username}).`);
    }
    // Si l'autre personne nous avait déjà envoyé une demande OU qu'on utilise son Code Ami direct -> acceptation immédiate
    if (existing.requester_id === targetUser.id || matchedByFriendCode) {
      db.prepare("UPDATE friendships SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, existing.id);
      return {
        friendship: {
          id: existing.id,
          requesterId: existing.requester_id,
          addresseeId: existing.addressee_id,
          status: 'accepted',
          createdAt: existing.created_at,
          updatedAt: now,
          friend: targetUser,
          direction: 'accepted',
        },
        autoAccepted: true,
        message: `Vous êtes maintenant ami avec ${targetUser.name} !`,
      };
    }
    // Réactiver si déclinée auparavant
    db.prepare("UPDATE friendships SET status = 'pending', updated_at = ? WHERE id = ?").run(now, existing.id);
    return {
      friendship: {
        id: existing.id,
        requesterId: requesterId,
        addresseeId: targetUser.id,
        status: 'pending',
        createdAt: existing.created_at,
        updatedAt: now,
        friend: targetUser,
        direction: 'outgoing',
      },
      autoAccepted: false,
      message: `Demande d'ami envoyée à ${targetUser.name} (@${targetUser.username}).`,
    };
  }

  const newId = `friend_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialStatus: 'pending' | 'accepted' = matchedByFriendCode ? 'accepted' : 'pending';

  db.prepare(`
    INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newId, requesterId, targetUser.id, initialStatus, now, now);

  return {
    friendship: {
      id: newId,
      requesterId,
      addresseeId: targetUser.id,
      status: initialStatus,
      createdAt: now,
      updatedAt: now,
      friend: targetUser,
      direction: initialStatus === 'accepted' ? 'accepted' : 'outgoing',
    },
    autoAccepted: initialStatus === 'accepted',
    message:
      initialStatus === 'accepted'
        ? `Code Ami validé ! Vous êtes maintenant ami avec ${targetUser.name}.`
        : `Demande d'ami envoyée à ${targetUser.name} (@${targetUser.username}).`,
  };
}

export function respondToFriendRequest(friendshipId: string, accountId: string, accept: boolean): Friendship | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT id, requester_id, addressee_id, status, created_at, updated_at
    FROM friendships
    WHERE id = ?
  `).get(friendshipId) as {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) {
    throw new Error("Demande d'ami introuvable.");
  }
  if (row.addressee_id !== accountId && row.requester_id !== accountId) {
    throw new Error('Action non autorisée.');
  }

  const now = new Date().toISOString();
  const newStatus = accept ? 'accepted' : 'declined';
  db.prepare('UPDATE friendships SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, now, friendshipId);

  const otherId = row.requester_id === accountId ? row.addressee_id : row.requester_id;
  const otherUser = getAccountById(otherId);
  if (!otherUser) return null;

  return {
    id: row.id,
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: newStatus,
    createdAt: row.created_at,
    updatedAt: now,
    friend: otherUser,
    direction: accept ? 'accepted' : 'incoming',
  };
}

export function removeFriendship(accountId: string, friendAccountId: string): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    DELETE FROM friendships
    WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
  `).run(accountId, friendAccountId, friendAccountId, accountId);
  return (res as unknown as { changes: number }).changes > 0;
}

// --- COURSES JOINTES ENTRE AMIS (SHARED GROCERY GROUPS) ---

export function getSharedGroceryGroupsForAccount(accountId: string): SharedGroceryGroup[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM shared_grocery_groups ORDER BY updated_at DESC').all() as {
    id: string;
    name: string;
    created_by: string;
    member_ids_json: string;
    checked_items_json: string;
    created_at: string;
    updated_at: string;
  }[];

  const groups: SharedGroceryGroup[] = [];
  for (const r of rows) {
    let memberIds: string[] = [];
    let checkedItems: Record<string, boolean> = {};
    try {
      memberIds = JSON.parse(r.member_ids_json || '[]');
    } catch {
      memberIds = [];
    }
    if (!memberIds.includes(accountId)) continue;

    try {
      checkedItems = JSON.parse(r.checked_items_json || '{}');
    } catch {
      checkedItems = {};
    }

    const members = memberIds
      .map((id) => getAccountById(id))
      .filter((u): u is UserAccount => u !== null);

    groups.push({
      id: r.id,
      name: r.name,
      createdBy: r.created_by,
      memberIds,
      members,
      checkedItems,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  }

  return groups;
}

export function createSharedGroceryGroup(
  createdBy: string,
  name: string,
  friendIds: string[]
): SharedGroceryGroup {
  const db = getDatabase();
  const { friends } = getFriendsAndRequests(createdBy);
  const acceptedFriendIds = new Set(friends.map((f) => f.id));

  const validFriendIds = friendIds.filter((fid) => fid !== createdBy && acceptedFriendIds.has(fid));
  if (validFriendIds.length === 0) {
    throw new Error('Veuillez sélectionner au moins un ami accepté pour créer une course jointe.');
  }

  const allMemberIds = Array.from(new Set([createdBy, ...validFriendIds]));
  const members = allMemberIds
    .map((id) => getAccountById(id))
    .filter((u): u is UserAccount => u !== null);

  const cleanName =
    name.trim() ||
    `Course jointe (${members.map((m) => m.name).join(' & ')})`;

  const id = `joint_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO shared_grocery_groups (id, name, created_by, member_ids_json, checked_items_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, '{}', ?, ?)
  `).run(id, cleanName, createdBy, JSON.stringify(allMemberIds), now, now);

  return {
    id,
    name: cleanName,
    createdBy,
    memberIds: allMemberIds,
    members,
    checkedItems: {},
    createdAt: now,
    updatedAt: now,
  };
}

export function toggleSharedGroupCheckedItem(
  groupId: string,
  accountId: string,
  itemId: string,
  checked?: boolean
): SharedGroceryGroup | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM shared_grocery_groups WHERE id = ?').get(groupId) as {
    id: string;
    name: string;
    created_by: string;
    member_ids_json: string;
    checked_items_json: string;
    created_at: string;
    updated_at: string;
  } | undefined;

  if (!row) return null;
  let memberIds: string[] = [];
  try {
    memberIds = JSON.parse(row.member_ids_json || '[]');
  } catch {
    memberIds = [];
  }
  if (!memberIds.includes(accountId)) {
    throw new Error('Vous ne faites pas partie de cette course jointe.');
  }

  let checkedItems: Record<string, boolean> = {};
  try {
    checkedItems = JSON.parse(row.checked_items_json || '{}');
  } catch {
    checkedItems = {};
  }

  const nextVal = checked !== undefined ? checked : !checkedItems[itemId];
  if (nextVal) {
    checkedItems[itemId] = true;
  } else {
    delete checkedItems[itemId];
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE shared_grocery_groups SET checked_items_json = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(checkedItems),
    now,
    groupId
  );

  const members = memberIds
    .map((id) => getAccountById(id))
    .filter((u): u is UserAccount => u !== null);

  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    memberIds,
    members,
    checkedItems,
    createdAt: row.created_at,
    updatedAt: now,
  };
}

export function deleteSharedGroceryGroup(groupId: string, accountId: string): boolean {
  const db = getDatabase();
  const row = db.prepare('SELECT member_ids_json FROM shared_grocery_groups WHERE id = ?').get(groupId) as {
    member_ids_json: string;
  } | undefined;
  if (!row) return false;
  const memberIds: string[] = JSON.parse(row.member_ids_json || '[]');
  if (!memberIds.includes(accountId)) {
    throw new Error('Action non autorisée.');
  }
  const res = db.prepare('DELETE FROM shared_grocery_groups WHERE id = ?').run(groupId);
  return (res as unknown as { changes: number }).changes > 0;
}

export function shareRecipeWithFriend(recipe: Recipe, fromAccountId: string, toFriendId: string): Recipe {
  const { friends } = getFriendsAndRequests(fromAccountId);
  if (!friends.some((f) => f.id === toFriendId)) {
    throw new Error('Vous ne pouvez partager une recette qu’avec un ami accepté.');
  }
  const sender = getAccountById(fromAccountId);
  const sharedTag = sender ? `partagé-par-${sender.username || sender.id}` : 'partagé';
  const tags = Array.from(new Set([...(recipe.tags || []), sharedTag]));

  return saveCustomRecipe({
    ...recipe,
    id: `shared_recipe_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdBy: toFriendId,
    tags,
  });
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
      case 'partnerCarbs':
        settings.partnerCarbs = Number(row.value) || baseDefaults.partnerCarbs;
        break;
      case 'partnerFat':
        settings.partnerFat = Number(row.value) || baseDefaults.partnerFat;
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

export function getAllCustomRecipes(accountId?: string): Recipe[] {
  const db = getDatabase();
  const rows = (
    accountId
      ? db.prepare('SELECT * FROM custom_recipes WHERE created_by = ? ORDER BY updated_at DESC').all(accountId)
      : db.prepare('SELECT * FROM custom_recipes ORDER BY updated_at DESC').all()
  ) as unknown as CustomRecipeRow[];

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

export function saveCustomRecipe(
  recipeData: Partial<Recipe>,
  customCatalog?: Record<string, Ingredient>
): Recipe {
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

  // Obtenir le catalogue des produits personnalisés si non fourni
  let catalogToUse = customCatalog;
  if (!catalogToUse) {
    try {
      const customProducts = getCustomProducts();
      catalogToUse = Object.fromEntries(customProducts.map((p) => [p.id, p]));
    } catch {
      catalogToUse = undefined;
    }
  }

  // Calcul automatique précis des macros à partir des ingrédients de la BD et du catalogue personnalisé
  const nutrients = calculateRecipeNutrients(ingredients, servings, catalogToUse);

  // Filet de sécurité / conservation des macros si calcul = 0 ou si des valeurs manuelles explicites ont été passées
  const hasManualCalories = typeof recipeData.caloriesPerServing === 'number' && recipeData.caloriesPerServing > 0;
  const hasManualProtein = typeof recipeData.proteinPerServing === 'number' && recipeData.proteinPerServing > 0;
  const hasManualCarbs = typeof recipeData.carbsPerServing === 'number' && recipeData.carbsPerServing > 0;
  const hasManualFat = typeof recipeData.fatPerServing === 'number' && recipeData.fatPerServing > 0;

  const finalCalories = (hasManualCalories || nutrients.caloriesPerServing === 0)
    ? (recipeData.caloriesPerServing ?? nutrients.caloriesPerServing)
    : nutrients.caloriesPerServing;

  const finalProtein = (hasManualProtein || nutrients.proteinPerServing === 0)
    ? (recipeData.proteinPerServing ?? nutrients.proteinPerServing)
    : nutrients.proteinPerServing;

  const finalCarbs = (hasManualCarbs || nutrients.carbsPerServing === 0)
    ? (recipeData.carbsPerServing ?? nutrients.carbsPerServing)
    : nutrients.carbsPerServing;

  const finalFat = (hasManualFat || nutrients.fatPerServing === 0)
    ? (recipeData.fatPerServing ?? nutrients.fatPerServing)
    : nutrients.fatPerServing;

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
    finalCalories,
    finalProtein,
    finalCarbs,
    finalFat,
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
    caloriesPerServing: finalCalories,
    proteinPerServing: finalProtein,
    carbsPerServing: finalCarbs,
    fatPerServing: finalFat,
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

export function deleteAllCustomRecipes(): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM custom_recipes');
  const res = stmt.run();
  return (res as unknown as { changes: number }).changes > 0;
}

// --- GESTION DES PRODUITS PERSONNALISÉS (CODES-BARRES ET CRÉATIONS) ---

export function getCustomProducts(): Ingredient[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM custom_products ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    aisle: r.aisle || 'EPICERIE',
    baseUnit: r.unit === 'ml' ? 'ml' : 'g',
    packaging: {
      amount: Number(r.amount) || 100,
      unit: r.unit || 'g',
      label: r.package_description || `${r.amount || 100} ${r.unit || 'g'}`,
      regularPriceMetro: Number(r.price) || 3.99,
      exactPriceMetro: Number(r.price) || 3.99,
      unitPricePer100g: r.amount ? Math.round((Number(r.price) / (Number(r.amount) / 100)) * 100) / 100 : 0,
      unitPriceLabel: `${r.price || 3.99} $ / emballage`,
      priceMaxi: Number(r.price) || 3.99,
      priceSuperC: Number(r.price) || 3.99,
      priceIGA: Number(r.price) || 3.99,
      isTaxable: Boolean(r.is_taxable),
      isMoiMemberPrice: false,
    },
    imageUrl: r.image_url || undefined,
    metroProductUrl: r.metro_url || `https://www.metro.ca/recherche?free-text=${encodeURIComponent(r.name)}`,
    barcode: r.barcode || undefined,
    isCustom: true,
    macrosPer100g: {
      calories: Math.round(Number(r.calories_per_100g) || 0),
      protein: Math.round((Number(r.protein_per_100g) || 0) * 10) / 10,
      carbs: Math.round((Number(r.carbs_per_100g) || 0) * 10) / 10,
      fat: Math.round((Number(r.fat_per_100g) || 0) * 10) / 10,
    },
  }));
}

export function saveCustomProduct(product: Partial<Ingredient>): Ingredient {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = product.id || (product.barcode ? `barcode_${product.barcode}` : `custom_prod_${Date.now()}`);
  const name = (product.name || 'Produit personnalisé').trim();
  const aisle = product.aisle || 'EPICERIE';
  const pkg = product.packaging || {
    amount: 100,
    unit: 'g',
    label: '100g',
    regularPriceMetro: 3.99,
    exactPriceMetro: 3.99,
    unitPricePer100g: 3.99,
    unitPriceLabel: '3.99 $ / 100g',
    priceMaxi: 3.79,
    priceSuperC: 3.69,
    priceIGA: 4.19,
    isTaxable: false,
    isMoiMemberPrice: false,
  };
  const price = pkg.exactPriceMetro ?? pkg.regularPriceMetro ?? 3.99;
  const barcode = product.barcode || null;
  const imageUrl = product.imageUrl || null;
  const metroUrl = product.metroProductUrl || null;
  const calories = product.macrosPer100g?.calories ?? 0;
  const protein = product.macrosPer100g?.protein ?? 0;
  const carbs = product.macrosPer100g?.carbs ?? 0;
  const fat = product.macrosPer100g?.fat ?? 0;
  const isTaxable = pkg.isTaxable ? 1 : 0;

  const stmt = db.prepare(`
    INSERT INTO custom_products (
      id, name, aisle, package_description, price, is_taxable, created_at,
      barcode, image_url, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g,
      amount, unit, metro_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      aisle = excluded.aisle,
      package_description = excluded.package_description,
      price = excluded.price,
      is_taxable = excluded.is_taxable,
      barcode = excluded.barcode,
      image_url = excluded.image_url,
      calories_per_100g = excluded.calories_per_100g,
      protein_per_100g = excluded.protein_per_100g,
      carbs_per_100g = excluded.carbs_per_100g,
      fat_per_100g = excluded.fat_per_100g,
      amount = excluded.amount,
      unit = excluded.unit,
      metro_url = excluded.metro_url
  `);

  stmt.run(
    id,
    name,
    aisle,
    pkg.label || `${pkg.amount} ${pkg.unit}`,
    price,
    isTaxable,
    now,
    barcode,
    imageUrl,
    calories,
    protein,
    carbs,
    fat,
    pkg.amount ?? 100,
    pkg.unit ?? 'g',
    metroUrl
  );

  return {
    id,
    name,
    aisle: aisle as any,
    baseUnit: pkg.unit === 'ml' ? 'ml' : 'g',
    packaging: pkg,
    imageUrl: imageUrl || undefined,
    metroProductUrl: metroUrl || undefined,
    barcode: barcode || undefined,
    isCustom: true,
    macrosPer100g: {
      calories,
      protein,
      carbs,
      fat,
    },
  };
}

export function deleteCustomProduct(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM custom_products WHERE id = ?');
  const res = stmt.run(id);
  return (res as unknown as { changes: number }).changes > 0;
}

// --- GESTION DU GARDE-MANGER (PANTRY) ---

export function getPantryMap(accountId?: string): Record<string, boolean> {
  const db = getDatabase();
  if (accountId && accountId !== 'ethan') {
    const rows = db
      .prepare('SELECT ingredient_id, in_stock FROM account_pantry_items WHERE account_id = ? AND in_stock = 1')
      .all(accountId) as { ingredient_id: string; in_stock: number }[];
    const map: Record<string, boolean> = {};
    for (const r of rows) {
      map[r.ingredient_id] = true;
    }
    return map;
  }
  const rows = db.prepare('SELECT ingredient_id, in_stock FROM pantry_items WHERE in_stock = 1').all() as { ingredient_id: string; in_stock: number }[];
  const map: Record<string, boolean> = {};
  for (const r of rows) {
    map[r.ingredient_id] = true;
  }
  return map;
}

export function setPantryItem(ingredientId: string, inStock: boolean, accountId: string = 'ethan'): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  if (inStock) {
    db.prepare(`
      INSERT INTO account_pantry_items (account_id, ingredient_id, in_stock, updated_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(account_id, ingredient_id) DO UPDATE SET in_stock = 1, updated_at = excluded.updated_at
    `).run(accountId, ingredientId, now);
  } else {
    db.prepare('DELETE FROM account_pantry_items WHERE account_id = ? AND ingredient_id = ?').run(accountId, ingredientId);
  }

  if (accountId === 'ethan') {
    if (inStock) {
      db.prepare(`
        INSERT INTO pantry_items (ingredient_id, in_stock, updated_at)
        VALUES (?, 1, ?)
        ON CONFLICT(ingredient_id) DO UPDATE SET in_stock = 1, updated_at = excluded.updated_at
      `).run(ingredientId, now);
    } else {
      db.prepare('DELETE FROM pantry_items WHERE ingredient_id = ?').run(ingredientId);
    }
  }
  return inStock;
}

// --- GESTION DES ARTICLES D'ÉPICERIE PERSONNALISÉS (LIVRE & CATALOGUE) ---

export function getCustomGroceryItems(): GroceryItem[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM custom_grocery_items ORDER BY created_at DESC').all() as any[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    aisle: r.aisle as any,
    neededQuantity: 1,
    unit: 'unite',
    packageDescription: r.package_description,
    packageCount: 1,
    regularPriceMetro: r.price,
    exactPriceMetro: r.price,
    unitPriceLabel: r.price > 0 ? `${r.price.toFixed(2)} $ / unité` : '',
    pricePer100g: 0,
    isTaxable: Boolean(r.is_taxable),
    isMoiMemberPrice: false,
    savingsAmount: 0,
    estimatedPriceMaxi: r.price,
    estimatedPriceSuperC: r.price,
    estimatedPriceIGA: r.price,
    checked: Boolean(r.checked),
    isCustom: true,
    ingredientId: r.ingredient_id || undefined,
    forAccount: r.for_account || 'common',
    neededBy: r.for_account === 'common' ? ['ethan', 'laurine'] : [r.for_account],
  }));
}

export function saveCustomGroceryItem(item: Partial<GroceryItem>): GroceryItem {
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = item.id || `custom_groc_${Date.now()}`;
  const name = (item.name || 'Article personnalisé').trim();
  const aisle = item.aisle || 'EPICERIE';
  const packageDescription = item.packageDescription || '1 unité';
  const price = item.exactPriceMetro ?? item.regularPriceMetro ?? 0;
  const isTaxable = item.isTaxable ? 1 : 0;
  const forAccount = item.forAccount || 'common';
  const checked = item.checked ? 1 : 0;
  const ingredientId = item.ingredientId || null;

  db.prepare(`
    INSERT INTO custom_grocery_items (id, name, aisle, package_description, price, is_taxable, for_account, checked, ingredient_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      aisle = excluded.aisle,
      package_description = excluded.package_description,
      price = excluded.price,
      is_taxable = excluded.is_taxable,
      for_account = excluded.for_account,
      checked = excluded.checked,
      ingredient_id = excluded.ingredient_id
  `).run(id, name, aisle, packageDescription, price, isTaxable, forAccount, checked, ingredientId, now);

  return {
    id,
    name,
    aisle: aisle as any,
    neededQuantity: 1,
    unit: 'unite',
    packageDescription,
    packageCount: 1,
    regularPriceMetro: price,
    exactPriceMetro: price,
    unitPriceLabel: price > 0 ? `${price.toFixed(2)} $ / unité` : '',
    pricePer100g: 0,
    isTaxable: Boolean(isTaxable),
    isMoiMemberPrice: false,
    savingsAmount: 0,
    estimatedPriceMaxi: price,
    estimatedPriceSuperC: price,
    estimatedPriceIGA: price,
    checked: Boolean(checked),
    isCustom: true,
    ingredientId: ingredientId || undefined,
    forAccount,
    neededBy: forAccount === 'common' ? ['ethan', 'laurine'] : [forAccount],
  };
}

export function deleteCustomGroceryItem(id: string): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM custom_grocery_items WHERE id = ?').run(id);
  return (res as unknown as { changes: number }).changes > 0;
}

export function toggleCustomGroceryItemChecked(id: string, checked: boolean): boolean {
  const db = getDatabase();
  db.prepare('UPDATE custom_grocery_items SET checked = ? WHERE id = ?').run(checked ? 1 : 0, id);
  return checked;
}

export function clearCheckedCustomGroceryItems(): boolean {
  const db = getDatabase();
  db.prepare('DELETE FROM custom_grocery_items WHERE checked = 1').run();
  return true;
}

// --- PROGRAMMATION & PLANNING HEBDOMADAIRE (SQLITE) ---

export interface ScheduledMealRecord {
  accountId: string;
  dayIndex: number;
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
  updatedAt: string;
}

export function getScheduledMeals(accountId?: string): ScheduledMealRecord[] {
  const db = getDatabase();
  if (accountId) {
    return db.prepare('SELECT account_id as accountId, day_index as dayIndex, meal_slot as mealSlot, recipe_id as recipeId, updated_at as updatedAt FROM scheduled_meals WHERE account_id = ? ORDER BY day_index ASC').all(accountId) as unknown as ScheduledMealRecord[];
  }
  return db.prepare('SELECT account_id as accountId, day_index as dayIndex, meal_slot as mealSlot, recipe_id as recipeId, updated_at as updatedAt FROM scheduled_meals ORDER BY account_id, day_index ASC').all() as unknown as ScheduledMealRecord[];
}

export function setScheduledMeal(
  accountId: string,
  dayIndex: number,
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  recipeId: string
): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO scheduled_meals (account_id, day_index, meal_slot, recipe_id, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id, day_index, meal_slot) DO UPDATE SET recipe_id = excluded.recipe_id, updated_at = excluded.updated_at
  `).run(accountId, dayIndex, mealSlot, recipeId, now);
  return true;
}

export function deleteScheduledMeal(
  accountId: string,
  dayIndex: number,
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM scheduled_meals WHERE account_id = ? AND day_index = ? AND meal_slot = ?').run(accountId, dayIndex, mealSlot);
  return (res as unknown as { changes: number }).changes > 0;
}

export function clearDaySchedule(accountId: string, dayIndex: number): boolean {
  const db = getDatabase();
  const res = db.prepare('DELETE FROM scheduled_meals WHERE account_id = ? AND day_index = ?').run(accountId, dayIndex);
  return (res as unknown as { changes: number }).changes > 0;
}

// --- SAUVEGARDE & RESTAURATION COMPLÈTE DE LA BASE DE DONNÉES ---

export function exportDatabaseBackup(): DatabaseBackup {
  const accounts = getAllAccounts();
  const activeAccountId = getActiveAccountId();
  const accountPreferences = getAllAccountsPreferences();
  const accountSettings = getAllAccountsSettings();
  const customPrices = getAllCustomPrices();
  const customRecipes = getAllCustomRecipes();
  const customProducts = getCustomProducts();
  const pantryMap = getPantryMap();
  const pantryItems = Object.keys(pantryMap);
  const customGroceryItems = getCustomGroceryItems();
  const scheduledMeals = getScheduledMeals();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    activeAccountId,
    accountPreferences,
    accountSettings,
    customPrices,
    customRecipes,
    customProducts,
    pantryItems,
    customGroceryItems,
    scheduledMeals,
  };
}

export function importDatabaseBackup(backup: Partial<DatabaseBackup>): { success: boolean; counts: any } {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stats = {
    accounts: 0,
    preferences: 0,
    settings: 0,
    customPrices: 0,
    recipes: 0,
    products: 0,
    pantry: 0,
    groceryItems: 0,
    scheduledMeals: 0,
  };

  db.exec('BEGIN TRANSACTION');
  try {
    // 1. Accounts
    if (backup.accounts && Array.isArray(backup.accounts)) {
      const stmt = db.prepare('INSERT INTO accounts (id, name, avatar_initials, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar_initials = excluded.avatar_initials');
      for (const acc of backup.accounts) {
        if (acc.id && acc.name) {
          stmt.run(acc.id, acc.name, acc.avatarInitials || acc.name.slice(0, 2).toUpperCase(), now);
          stats.accounts++;
        }
      }
    }

    if (backup.activeAccountId) {
      setActiveAccountId(backup.activeAccountId);
    }

    // 2. Account Preferences
    if (backup.accountPreferences && typeof backup.accountPreferences === 'object') {
      const stmt = db.prepare('INSERT INTO account_preferences (account_id, ingredient_id, status, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, ingredient_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at');
      for (const [accId, prefs] of Object.entries(backup.accountPreferences)) {
        if (typeof prefs === 'object') {
          for (const [ingId, status] of Object.entries(prefs)) {
            if (status === 'liked' || status === 'disliked' || status === 'neutral') {
              stmt.run(accId, ingId, status, now);
              stats.preferences++;
            }
          }
        }
      }
    }

    // 3. Account Settings
    if (backup.accountSettings && typeof backup.accountSettings === 'object') {
      const stmt = db.prepare('INSERT INTO account_settings (account_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(account_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
      for (const [accId, settings] of Object.entries(backup.accountSettings)) {
        if (typeof settings === 'object') {
          for (const [k, v] of Object.entries(settings)) {
            stmt.run(accId, k, String(v), now);
            stats.settings++;
          }
        }
      }
    }

    // 4. Custom Prices
    if (backup.customPrices && typeof backup.customPrices === 'object') {
      const stmt = db.prepare('INSERT INTO custom_prices (ingredient_id, custom_price, updated_at) VALUES (?, ?, ?) ON CONFLICT(ingredient_id) DO UPDATE SET custom_price = excluded.custom_price, updated_at = excluded.updated_at');
      for (const [ingId, price] of Object.entries(backup.customPrices)) {
        if (typeof price === 'number') {
          stmt.run(ingId, price, now);
          stats.customPrices++;
        }
      }
    }

    // 5. Custom Recipes
    if (backup.customRecipes && Array.isArray(backup.customRecipes)) {
      for (const r of backup.customRecipes) {
        if (r.title) {
          saveCustomRecipe(r);
          stats.recipes++;
        }
      }
    }

    // 6. Custom Products
    if (backup.customProducts && Array.isArray(backup.customProducts)) {
      for (const p of backup.customProducts) {
        if (p.name) {
          saveCustomProduct(p);
          stats.products++;
        }
      }
    }

    // 7. Pantry Items
    if (backup.pantryItems && Array.isArray(backup.pantryItems)) {
      const stmt = db.prepare('INSERT INTO pantry_items (ingredient_id, in_stock, updated_at) VALUES (?, 1, ?) ON CONFLICT(ingredient_id) DO UPDATE SET in_stock = 1, updated_at = excluded.updated_at');
      for (const id of backup.pantryItems) {
        stmt.run(id, now);
        stats.pantry++;
      }
    }

    // 8. Custom Grocery Items
    if (backup.customGroceryItems && Array.isArray(backup.customGroceryItems)) {
      for (const gi of backup.customGroceryItems) {
        if (gi.name) {
          saveCustomGroceryItem(gi);
          stats.groceryItems++;
        }
      }
    }

    // 9. Scheduled Meals
    if (backup.scheduledMeals && Array.isArray(backup.scheduledMeals)) {
      const stmt = db.prepare('INSERT INTO scheduled_meals (account_id, day_index, meal_slot, recipe_id, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(account_id, day_index, meal_slot) DO UPDATE SET recipe_id = excluded.recipe_id, updated_at = excluded.updated_at');
      for (const sm of backup.scheduledMeals) {
        if (sm.accountId && sm.recipeId && sm.mealSlot !== undefined && sm.dayIndex !== undefined) {
          stmt.run(sm.accountId, sm.dayIndex, sm.mealSlot, sm.recipeId, now);
          stats.scheduledMeals++;
        }
      }
    }

    db.exec('COMMIT');
    return { success: true, counts: stats };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}



