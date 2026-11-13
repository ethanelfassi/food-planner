import { NextRequest, NextResponse } from 'next/server';
import { RECIPES } from '@/data/recipes';
import {
  DAY_NAMES,
  DAY_NAMES_SHORT,
  MONTH_NAMES_SHORT,
  getDayIndex,
  getMondayOfWeek,
  toDateKey,
} from '@/lib/date-utils';
import {
  bumpDbVersion,
  getAccountBySessionToken,
  getActiveAccountId,
  getAllAccounts,
  getAllCustomPrices,
  getAllCustomRecipes,
  getCustomGroceryItems,
  getCustomProducts,
  getDailyTrackerLogs,
  getPantryMap,
  getPreferencesForAccount,
  getScheduledMeals,
  getSettingsForAccount,
  saveDailyTrackerLog,
} from '@/lib/db';
import { generateCommonGroceryList } from '@/lib/grocery';
import { applyScheduledMealsToWeeklyPlan, generateWeeklyPlan } from '@/lib/planner';
import { TrackerCustomEntry } from '@/types';

type MealSlotKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEAL_SLOTS: { key: MealSlotKey; label: string; shortLabel: string }[] = [
  { key: 'breakfast', label: 'Petit-dej', shortLabel: 'Dej.' },
  { key: 'lunch', label: 'Dejeuner', shortLabel: 'Midi' },
  { key: 'dinner', label: 'Diner', shortLabel: 'Soir' },
  { key: 'snack', label: 'Collation', shortLabel: 'Coll.' },
];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function resolveAccountId(req: NextRequest, bodyAccount?: unknown): string {
  const accounts = getAllAccounts();
  const requestedRaw =
    typeof bodyAccount === 'string' && bodyAccount.trim()
      ? bodyAccount.trim()
      : req.nextUrl.searchParams.get('account')?.trim() || '';

  if (requestedRaw) {
    const matched = accounts.find(
      (a) => a.id === requestedRaw || a.name.toLowerCase() === requestedRaw.toLowerCase()
    );
    if (matched) return matched.id;
  }

  const sessionToken = req.cookies.get('fp_session')?.value;
  if (sessionToken) {
    const bySession = getAccountBySessionToken(sessionToken);
    if (bySession) return bySession.id;
  }

  const active = getActiveAccountId();
  if (active && accounts.some((a) => a.id === active)) {
    return active;
  }

  return accounts[0]?.id || 'ethan';
}

function resolveBaseUrl(req: NextRequest): string {
  const protoHeader = req.headers.get('x-forwarded-proto');
  const proto = protoHeader ? protoHeader.split(',')[0].trim() : 'http';
  const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (hostHeader) {
    return `${proto}://${hostHeader.split(',')[0].trim()}`;
  }
  return 'http://192.168.1.88:3000';
}

function getTodayContext(accountId: string) {
  const now = new Date();
  const dateKey = toDateKey(now);
  const dayIndex = getDayIndex(now);
  const monday = getMondayOfWeek(now);
  const logs = getDailyTrackerLogs(accountId);
  const existingLog = logs.find(
    (l) => (l.date && l.date === dateKey) || (!l.date && l.dayIndex === dayIndex)
  );
  return { now, dateKey, dayIndex, monday, existingLog };
}

function buildWidgetPayload(accountId: string) {
  const { now, dateKey, dayIndex, monday, existingLog } = getTodayContext(accountId);
  const accounts = getAllAccounts();
  const account = accounts.find((a) => a.id === accountId);
  const accountName = account?.name || accountId;

  const prefs = getPreferencesForAccount(accountId);
  const settings = getSettingsForAccount(accountId);
  const targetCalories = Math.round(settings?.targetCalories ?? 3050);
  const targetProtein = Math.round(settings?.targetProtein ?? 165);
  const targetCarbs = Math.round(settings?.targetCarbs ?? 390);
  const targetFat = Math.round(settings?.targetFat ?? 90);

  const customRecipes = getAllCustomRecipes();
  const allRecipes = [...RECIPES, ...customRecipes];
  const accRecipes = customRecipes.filter((r) => !r.createdBy || r.createdBy === accountId);
  const basePlan = generateWeeklyPlan(prefs, accRecipes, settings, monday);
  const scheduled = getScheduledMeals(accountId);
  const plan = applyScheduledMealsToWeeklyPlan(basePlan, accountId, scheduled, allRecipes);

  const todayPlan =
    plan.days.find((d) => d.date === dateKey) ||
    plan.days.find((d) => d.dayIndex === dayIndex) ||
    plan.days[0];

  const eatenMeals: Record<MealSlotKey, boolean> = {
    breakfast: Boolean(existingLog?.eatenMeals?.breakfast),
    lunch: Boolean(existingLog?.eatenMeals?.lunch),
    dinner: Boolean(existingLog?.eatenMeals?.dinner),
    snack: Boolean(existingLog?.eatenMeals?.snack),
  };

  const customEntries: TrackerCustomEntry[] = Array.isArray(existingLog?.customEntries)
    ? existingLog.customEntries
    : [];

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  let plannedCalories = 0;
  let plannedProtein = 0;
  let plannedCarbs = 0;
  let plannedFat = 0;

  const meals = MEAL_SLOTS.map(({ key, label, shortLabel }) => {
    const recipe = todayPlan?.[key];
    const calories = Math.round(recipe?.caloriesPerServing ?? 0);
    const protein = Math.round(recipe?.proteinPerServing ?? 0);
    const carbs = Math.round(recipe?.carbsPerServing ?? 0);
    const fat = Math.round(recipe?.fatPerServing ?? 0);
    const eaten = eatenMeals[key];

    plannedCalories += calories;
    plannedProtein += protein;
    plannedCarbs += carbs;
    plannedFat += fat;

    if (eaten) {
      consumedCalories += calories;
      consumedProtein += protein;
      consumedCarbs += carbs;
      consumedFat += fat;
    }

    return {
      slot: key,
      label,
      shortLabel,
      title: recipe?.title || 'Repas non defini',
      calories,
      protein,
      carbs,
      fat,
      eaten,
    };
  });

  for (const entry of customEntries) {
    consumedCalories += Math.round(entry.calories || 0);
    consumedProtein += Math.round(entry.protein || 0);
    consumedCarbs += Math.round(entry.carbs || 0);
    consumedFat += Math.round(entry.fat || 0);
  }

  const nextMeal = meals.find((m) => !m.eaten) || null;
  const eatenCount = meals.filter((m) => m.eaten).length;

  const customPrices = getAllCustomPrices();
  const customProducts = getCustomProducts();
  const pantryMap = getPantryMap(accountId);
  const customGrocery = getCustomGroceryItems();
  const commonItems = generateCommonGroceryList(
    [{ accountId, accountName, plan }],
    customPrices,
    customProducts,
    pantryMap
  );

  const accountCustomGrocery = customGrocery.filter(
    (g) => !g.forAccount || g.forAccount === 'common' || g.forAccount === accountId
  );
  const remainingAutoItems = commonItems.filter((item) => !item.isInPantry && !item.checked);
  const remainingCustomItems = accountCustomGrocery.filter(
    (item) => !item.isInPantry && !item.checked
  );
  const remainingGroceryCount = remainingAutoItems.length + remainingCustomItems.length;
  const topRemainingGrocery = [...remainingAutoItems, ...remainingCustomItems]
    .slice(0, 5)
    .map((item) => item.name);

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    accountId,
    accountName,
    date: dateKey,
    dayIndex,
    dayName: DAY_NAMES[dayIndex],
    dayShortLabel: `${DAY_NAMES_SHORT[dayIndex]} ${now.getDate()} ${MONTH_NAMES_SHORT[now.getMonth()]}`,
    calories: {
      consumed: consumedCalories,
      planned: plannedCalories,
      target: targetCalories,
      remaining: Math.max(0, targetCalories - consumedCalories),
    },
    protein: {
      consumed: consumedProtein,
      planned: plannedProtein,
      target: targetProtein,
      remaining: Math.max(0, targetProtein - consumedProtein),
    },
    carbs: {
      consumed: consumedCarbs,
      planned: plannedCarbs,
      target: targetCarbs,
      remaining: Math.max(0, targetCarbs - consumedCarbs),
    },
    fat: {
      consumed: consumedFat,
      planned: plannedFat,
      target: targetFat,
      remaining: Math.max(0, targetFat - consumedFat),
    },
    eatenCount,
    totalMeals: meals.length,
    meals,
    customEntriesCount: customEntries.length,
    customEntries: customEntries.map((c) => ({
      id: c.id,
      name: c.name,
      calories: Math.round(c.calories || 0),
      protein: Math.round(c.protein || 0),
      carbs: Math.round(c.carbs || 0),
      fat: Math.round(c.fat || 0),
    })),
    nextMeal,
    grocery: {
      remainingCount: remainingGroceryCount,
      totalAutoCount: commonItems.length,
      topItems: topRemainingGrocery,
    },
  };
}

function buildScriptableCode(baseUrl: string, accountId: string): string {
  const safeBaseUrl = JSON.stringify(baseUrl.replace(/\/+$/, ''));
  const safeAccount = JSON.stringify(accountId);

  return [
    '// Widget iOS FoodPlanner pour Scriptable',
    '// Pour changer de compte (ex: "laurine"), renseigne Parameter dans les reglages du widget Scriptable.',
    `const BASE_URL = ${safeBaseUrl};`,
    `const DEFAULT_ACCOUNT = ${safeAccount};`,
    'const ACCOUNT = (args.widgetParameter && String(args.widgetParameter).trim()) ? String(args.widgetParameter).trim() : DEFAULT_ACCOUNT;',
    'const API_URL = BASE_URL + "/api/widget?account=" + encodeURIComponent(ACCOUNT);',
    '',
    'const fm = FileManager.local();',
    'const CACHE_PATH = fm.joinPath(fm.documentsDirectory(), "fp_widget_" + ACCOUNT.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json");',
    '',
    'async function loadData() {',
    '  try {',
    '    const req = new Request(API_URL);',
    '    req.timeoutInterval = 6;',
    '    const data = await req.loadJSON();',
    '    if (data && data.ok) {',
    '      fm.writeString(CACHE_PATH, JSON.stringify(data));',
    '      return { data: data, offline: false };',
    '    }',
    '  } catch (err) {',
    '    // Hors-ligne ou serveur inaccessible : fallback sur le cache local',
    '  }',
    '  if (fm.fileExists(CACHE_PATH)) {',
    '    try {',
    '      const cached = JSON.parse(fm.readString(CACHE_PATH));',
    '      return { data: cached, offline: true };',
    '    } catch (e) {}',
    '  }',
    '  return { data: null, offline: true };',
    '}',
    '',
    'async function postAction(payload) {',
    '  const req = new Request(BASE_URL + "/api/widget");',
    '  req.method = "POST";',
    '  req.timeoutInterval = 8;',
    '  req.headers = { "Content-Type": "application/json" };',
    '  req.body = JSON.stringify(payload);',
    '  const res = await req.loadJSON();',
    '  if (res && res.ok) {',
    '    fm.writeString(CACHE_PATH, JSON.stringify(res));',
    '  }',
    '  return res;',
    '}',
    '',
    'function makeProgressBar(width, height, ratio, barColorHex) {',
    '  const ctx = new DrawContext();',
    '  ctx.size = new Size(width, height);',
    '  ctx.opaque = false;',
    '  ctx.respectScreenScale = true;',
    '  const bgPath = new Path();',
    '  bgPath.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);',
    '  ctx.addPath(bgPath);',
    '  ctx.setFillColor(new Color("#334155"));',
    '  ctx.fillPath();',
    '  const clamped = Math.max(0, Math.min(1, ratio || 0));',
    '  if (clamped > 0) {',
    '    const fillW = Math.max(height, Math.round(width * clamped));',
    '    const fgPath = new Path();',
    '    fgPath.addRoundedRect(new Rect(0, 0, fillW, height), height / 2, height / 2);',
    '    ctx.addPath(fgPath);',
    '    ctx.setFillColor(new Color(barColorHex));',
    '    ctx.fillPath();',
    '  }',
    '  return ctx.getImage();',
    '}',
    '',
    'function addText(parent, text, size, weight, colorHex, maxLines) {',
    '  const t = parent.addText(text);',
    '  if (weight === "bold") t.font = Font.boldSystemFont(size);',
    '  else if (weight === "semibold") t.font = Font.semiboldSystemFont(size);',
    '  else t.font = Font.systemFont(size);',
    '  t.textColor = new Color(colorHex);',
    '  if (maxLines) t.lineLimit = maxLines;',
    '  return t;',
    '}',
    '',
    'function buildWidget(data, offline) {',
    '  const w = new ListWidget();',
    '  const grad = new LinearGradient();',
    '  grad.colors = [new Color("#0F172A"), new Color("#1E293B")];',
    '  grad.locations = [0, 1];',
    '  w.backgroundGradient = grad;',
    '  const family = config.widgetFamily || "medium";',
    '  w.setPadding(12, 14, 12, 14);',
    '',
    '  if (!data) {',
    '    addText(w, "FoodPlanner", 14, "bold", "#F8FAFC", 1);',
    '    w.addSpacer(6);',
    '    addText(w, "Serveur inaccessible sur " + BASE_URL, 11, "regular", "#FCA5A5", 3);',
    '    return w;',
    '  }',
    '',
    '  const kcalRatio = data.calories.target > 0 ? data.calories.consumed / data.calories.target : 0;',
    '  const protRatio = data.protein.target > 0 ? data.protein.consumed / data.protein.target : 0;',
    '  const carbsRatio = data.carbs.target > 0 ? data.carbs.consumed / data.carbs.target : 0;',
    '  const fatRatio = data.fat.target > 0 ? data.fat.consumed / data.fat.target : 0;',
    '',
    '  // En-tete',
    '  const header = w.addStack();',
    '  header.layoutHorizontally();',
    '  header.centerAlignContent();',
    '  addText(header, "FoodPlanner" + (family === "small" ? "" : " - " + data.accountName), 12, "bold", "#38BDF8", 1);',
    '  header.addSpacer();',
    '  const statusStr = offline ? "Hors-ligne" : data.dayShortLabel;',
    '  addText(header, statusStr, 10, "semibold", offline ? "#FBBF24" : "#94A3B8", 1);',
    '',
    '  if (family === "small") {',
    '    w.addSpacer(4);',
    '    addText(w, data.calories.consumed + " / " + data.calories.target + " kcal", 15, "bold", "#F8FAFC", 1);',
    '    w.addSpacer(4);',
    '    const bar = w.addImage(makeProgressBar(130, 5, kcalRatio, "#22C55E"));',
    '    bar.imageSize = new Size(130, 5);',
    '    w.addSpacer(5);',
    '    const smallMacros = [',
    '      { label: "Prot", consumed: data.protein.consumed, target: data.protein.target, ratio: protRatio, color: "#38BDF8" },',
    '      { label: "Gluc", consumed: data.carbs.consumed, target: data.carbs.target, ratio: carbsRatio, color: "#FBBF24" },',
    '      { label: "Lip", consumed: data.fat.consumed, target: data.fat.target, ratio: fatRatio, color: "#F472B6" },',
    '    ];',
    '    for (let i = 0; i < smallMacros.length; i++) {',
    '      const sm = smallMacros[i];',
    '      const row = w.addStack();',
    '      row.layoutHorizontally();',
    '      row.centerAlignContent();',
    '      addText(row, sm.label + " " + sm.consumed + "/" + sm.target + "g", 10, "semibold", sm.color, 1);',
    '      row.addSpacer();',
    '      const mb = row.addImage(makeProgressBar(36, 4, sm.ratio, sm.color));',
    '      mb.imageSize = new Size(36, 4);',
    '      if (i < smallMacros.length - 1) w.addSpacer(2);',
    '    }',
    '    w.addSpacer();',
    '    if (data.nextMeal) {',
    '      addText(w, "Suiv: " + data.nextMeal.shortLabel + " " + data.nextMeal.title, 9, "semibold", "#CBD5E1", 1);',
    '    } else {',
    '      addText(w, data.eatenCount + "/" + data.totalMeals + " repas valides", 9, "semibold", "#4ADE80", 1);',
    '    }',
    '    return w;',
    '  }',
    '',
    '  w.addSpacer(6);',
    '  const macroRow = w.addStack();',
    '  macroRow.layoutHorizontally();',
    '  macroRow.centerAlignContent();',
    '  addText(macroRow, data.calories.consumed + " / " + data.calories.target + " kcal", 16, "bold", "#F8FAFC", 1);',
    '  macroRow.addSpacer();',
    '  addText(macroRow, data.eatenCount + "/" + data.totalMeals + " repas  |  " + data.grocery.remainingCount + " courses", 10, "semibold", "#94A3B8", 1);',
    '',
    '  w.addSpacer(4);',
    '  const mainBarW = family === "large" ? 300 : 290;',
    '  const mainBar = w.addImage(makeProgressBar(mainBarW, 6, kcalRatio, "#22C55E"));',
    '  mainBar.imageSize = new Size(mainBarW, 6);',
    '',
    '  w.addSpacer(5);',
    '  const subMacros = w.addStack();',
    '  subMacros.layoutHorizontally();',
    '  const colW = family === "large" ? 94 : 90;',
    '  const macroCols = [',
    '    { text: "Prot " + data.protein.consumed + "/" + data.protein.target + "g", ratio: protRatio, color: "#38BDF8" },',
    '    { text: "Gluc " + data.carbs.consumed + "/" + data.carbs.target + "g", ratio: carbsRatio, color: "#FBBF24" },',
    '    { text: "Lip " + data.fat.consumed + "/" + data.fat.target + "g", ratio: fatRatio, color: "#F472B6" },',
    '  ];',
    '  for (let i = 0; i < macroCols.length; i++) {',
    '    const mc = macroCols[i];',
    '    const col = subMacros.addStack();',
    '    col.layoutVertically();',
    '    addText(col, mc.text, 10, "semibold", mc.color, 1);',
    '    col.addSpacer(2);',
    '    const b = col.addImage(makeProgressBar(colW, 4, mc.ratio, mc.color));',
    '    b.imageSize = new Size(colW, 4);',
    '    if (i < macroCols.length - 1) subMacros.addSpacer(10);',
    '  }',
    '',
    '  w.addSpacer(6);',
    '  for (let i = 0; i < data.meals.length; i++) {',
    '    const m = data.meals[i];',
    '    const row = w.addStack();',
    '    row.layoutHorizontally();',
    '    row.centerAlignContent();',
    '    const mark = m.eaten ? "[x] " : "[ ] ";',
    '    addText(row, mark + m.shortLabel, 10, "bold", m.eaten ? "#4ADE80" : "#94A3B8", 1);',
    '    row.addSpacer(5);',
    '    addText(row, m.title, 10, m.eaten ? "regular" : "semibold", m.eaten ? "#94A3B8" : "#F1F5F9", 1);',
    '    row.addSpacer();',
    '    const mMacroStr = m.calories + " kcal · " + m.protein + "P " + m.carbs + "G " + m.fat + "L";',
    '    addText(row, mMacroStr, 9, "regular", "#94A3B8", 1);',
    '    if (family === "large" && i < data.meals.length - 1) {',
    '      w.addSpacer(5);',
    '    } else if (i < data.meals.length - 1) {',
    '      w.addSpacer(2);',
    '    }',
    '  }',
    '',
    '  if (family === "large") {',
    '    w.addSpacer(10);',
    '    addText(w, "Courses restantes (" + data.grocery.remainingCount + ")", 11, "bold", "#38BDF8", 1);',
    '    w.addSpacer(3);',
    '    if (data.grocery.topItems && data.grocery.topItems.length > 0) {',
    '      addText(w, data.grocery.topItems.join(" - "), 10, "regular", "#CBD5E1", 2);',
    '    } else {',
    '      addText(w, "Tout est coche ou deja dans le garde-manger.", 10, "regular", "#94A3B8", 1);',
    '    }',
    '    if (data.customEntriesCount > 0) {',
    '      w.addSpacer(6);',
    '      addText(w, "+ " + data.customEntriesCount + " ajout(s) libre(s) aujourd hui", 10, "regular", "#A7F3D0", 1);',
    '    }',
    '    w.addSpacer();',
    '    addText(w, "Appuie sur le widget pour cocher un repas ou ajouter des macros", 9, "regular", "#64748B", 1);',
    '  }',
    '',
    '  return w;',
    '}',
    '',
    'async function showInteractiveMenu(initialData) {',
    '  let current = initialData;',
    '  if (!current) {',
    '    const alert = new Alert();',
    '    alert.title = "FoodPlanner";',
    '    alert.message = "Impossible de joindre " + BASE_URL + " et aucun cache disponible.";',
    '    alert.addAction("Ouvrir dans Safari");',
    '    alert.addCancelAction("Fermer");',
    '    const choice = await alert.present();',
    '    if (choice === 0) Safari.open(BASE_URL);',
    '    return;',
    '  }',
    '',
    '  const menu = new Alert();',
    '  menu.title = "FoodPlanner - " + current.accountName;',
    '  menu.message = current.dayShortLabel + " | " + current.calories.consumed + "/" + current.calories.target + " kcal | P " + current.protein.consumed + "/" + current.protein.target + "g | G " + current.carbs.consumed + "/" + current.carbs.target + "g | L " + current.fat.consumed + "/" + current.fat.target + "g";',
    '  for (let i = 0; i < current.meals.length; i++) {',
    '    const m = current.meals[i];',
    '    const prefix = m.eaten ? "[Fait] " : "[A faire] ";',
    '    menu.addAction(prefix + m.label + " : " + m.title);',
    '  }',
    '  menu.addAction("+ Ajout rapide (kcal / P / G / L)");',
    '  menu.addAction("Ouvrir FoodPlanner");',
    '  menu.addCancelAction("Fermer");',
    '',
    '  const idx = await menu.presentSheet();',
    '  if (idx === -1) return;',
    '',
    '  if (idx >= 0 && idx < current.meals.length) {',
    '    const meal = current.meals[idx];',
    '    try {',
    '      await postAction({ account: ACCOUNT, action: "toggle_meal", slot: meal.slot, eaten: !meal.eaten });',
    '    } catch (e) {',
    '      const errAlert = new Alert();',
    '      errAlert.title = "Erreur reseau";',
    '      errAlert.message = "Connexion requise au serveur local pour enregistrer.";',
    '      errAlert.addCancelAction("OK");',
    '      await errAlert.present();',
    '    }',
    '    return;',
    '  }',
    '',
    '  if (idx === current.meals.length) {',
    '    const quick = new Alert();',
    '    quick.title = "Ajout rapide aujourd hui";',
    '    quick.message = "Entre un aliment ou encas pris hors planning.";',
    '    quick.addTextField("Nom (ex: Shaker whey)", "");',
    '    quick.addTextField("Calories (kcal)", "250");',
    '    quick.addTextField("Proteines (g)", "25");',
    '    quick.addTextField("Glucides (g)", "0");',
    '    quick.addTextField("Lipides (g)", "0");',
    '    quick.addAction("Enregistrer");',
    '    quick.addCancelAction("Annuler");',
    '    const resIdx = await quick.presentAlert();',
    '    if (resIdx === 0) {',
    '      const name = quick.textFieldValue(0) || "Ajout rapide";',
    '      const calories = Number(quick.textFieldValue(1)) || 0;',
    '      const protein = Number(quick.textFieldValue(2)) || 0;',
    '      const carbs = Number(quick.textFieldValue(3)) || 0;',
    '      const fat = Number(quick.textFieldValue(4)) || 0;',
    '      try {',
    '        await postAction({ account: ACCOUNT, action: "quick_add", name: name, calories: calories, protein: protein, carbs: carbs, fat: fat });',
    '      } catch (e) {',
    '        const errAlert = new Alert();',
    '        errAlert.title = "Erreur reseau";',
    '        errAlert.message = "Connexion requise au serveur local pour enregistrer.";',
    '        errAlert.addCancelAction("OK");',
    '        await errAlert.present();',
    '      }',
    '    }',
    '    return;',
    '  }',
    '',
    '  if (idx === current.meals.length + 1) {',
    '    Safari.open(BASE_URL);',
    '  }',
    '}',
    '',
    'const result = await loadData();',
    'if (config.runsInWidget) {',
    '  const widget = buildWidget(result.data, result.offline);',
    '  Script.setWidget(widget);',
    '} else {',
    '  await showInteractiveMenu(result.data);',
    '  const refreshed = await loadData();',
    '  const preview = buildWidget(refreshed.data, refreshed.offline);',
    '  Script.setWidget(preview);',
    '}',
    'Script.complete();',
  ].join('\n');
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const accountId = resolveAccountId(req);
    const format = req.nextUrl.searchParams.get('format');

    if (format === 'script') {
      const baseUrl = resolveBaseUrl(req);
      const script = buildScriptableCode(baseUrl, accountId);
      return new NextResponse(script, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/javascript; charset=utf-8',
          'Content-Disposition': `inline; filename="foodplanner-widget-${accountId}.js"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const payload = buildWidgetPayload(accountId);
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/widget] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la generation des donnees widget.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const accountId = resolveAccountId(req, body?.account);
    const action = typeof body?.action === 'string' ? body.action : '';

    const { dateKey, dayIndex, existingLog } = getTodayContext(accountId);
    const eatenMeals: Record<MealSlotKey, boolean> = {
      breakfast: Boolean(existingLog?.eatenMeals?.breakfast),
      lunch: Boolean(existingLog?.eatenMeals?.lunch),
      dinner: Boolean(existingLog?.eatenMeals?.dinner),
      snack: Boolean(existingLog?.eatenMeals?.snack),
    };
    const customEntries: TrackerCustomEntry[] = Array.isArray(existingLog?.customEntries)
      ? [...existingLog.customEntries]
      : [];

    if (action === 'toggle_meal') {
      const slot = body?.slot as MealSlotKey | undefined;
      if (!slot || !['breakfast', 'lunch', 'dinner', 'snack'].includes(slot)) {
        return NextResponse.json(
          { ok: false, error: 'Creneau repas invalide (breakfast, lunch, dinner, snack).' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      eatenMeals[slot] = typeof body?.eaten === 'boolean' ? body.eaten : !eatenMeals[slot];
    } else if (action === 'quick_add') {
      const name =
        typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Ajout rapide';
      const calories = Math.max(0, Math.round(Number(body?.calories) || 0));
      const protein = Math.max(0, Math.round(Number(body?.protein) || 0));
      const carbs = body?.carbs !== undefined ? Math.max(0, Math.round(Number(body.carbs) || 0)) : 0;
      const fat = body?.fat !== undefined ? Math.max(0, Math.round(Number(body.fat) || 0)) : 0;

      customEntries.push({
        id: `widget_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        calories,
        protein,
        carbs,
        fat,
      });
    } else {
      return NextResponse.json(
        { ok: false, error: 'Action non supportee (attendu: toggle_meal ou quick_add).' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    saveDailyTrackerLog({
      accountId,
      dayIndex,
      date: dateKey,
      eatenMeals,
      customEntries,
    });
    bumpDbVersion();

    const payload = buildWidgetPayload(accountId);
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[POST /api/widget] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Erreur lors de la mise a jour depuis le widget.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
