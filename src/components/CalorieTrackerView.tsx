'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DayPlan, WeeklyPlan, UserCustomizationSettings, DailyTrackerLog, TrackerCustomEntry } from '@/types';
import {
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  Check,
  Trophy,
  AlertCircle,
  Database,
  Trash2,
  Calendar,
  X,
  History,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { toDateKey } from '@/lib/date-utils';
import { CalendarModal } from './CalendarModal';

interface CalorieTrackerViewProps {
  currentDayPlan: DayPlan;
  weeklyPlan?: WeeklyPlan;
  activeAccountId?: string;
  userSettings?: UserCustomizationSettings;
  isDark: boolean;
  onOpenCalendar?: () => void;
}

const DEFAULT_EATEN_MEALS: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', boolean> = {
  breakfast: false,
  lunch: false,
  dinner: false,
  snack: false,
};

const CalorieTrackerViewComponent: React.FC<CalorieTrackerViewProps> = ({
  currentDayPlan,
  weeklyPlan,
  activeAccountId = 'ethan',
  userSettings,
  isDark,
  onOpenCalendar,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayPlan.dayIndex ?? 0);
  const [logsByDay, setLogsByDay] = useState<Record<number, DailyTrackerLog>>({});
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [allLogs, setAllLogs] = useState<DailyTrackerLog[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const [extraName, setExtraName] = useState('');
  const [extraCals, setExtraCals] = useState('');
  const [extraProt, setExtraProt] = useState('');
  const [extraCarbs, setExtraCarbs] = useState('');
  const [extraFat, setExtraFat] = useState('');

  useEffect(() => {
    if (typeof currentDayPlan.dayIndex === 'number') {
      setSelectedDayIndex(currentDayPlan.dayIndex);
    }
  }, [currentDayPlan.dayIndex]);

  // Charger les logs SQLite du compte actif
  useEffect(() => {
    let cancelled = false;
    async function loadTrackerLogs() {
      try {
        const res = await fetch(`/api/tracker?accountId=${encodeURIComponent(activeAccountId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.ok && Array.isArray(data.logs)) {
          setAllLogs(data.logs as DailyTrackerLog[]);
          const map: Record<number, DailyTrackerLog> = {};
          for (const log of data.logs as DailyTrackerLog[]) {
            map[log.dayIndex] = log;
          }
          setLogsByDay(map);
        }
      } catch (err) {
        console.warn('Impossible de charger les logs du tracker depuis SQLite:', err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }
    loadTrackerLogs();
    return () => {
      cancelled = true;
    };
  }, [activeAccountId]);

  const activeDayPlan: DayPlan =
    weeklyPlan?.days?.find((d) => d.dayIndex === selectedDayIndex) || currentDayPlan;

  const currentLog: DailyTrackerLog = logsByDay[selectedDayIndex] || {
    accountId: activeAccountId,
    dayIndex: selectedDayIndex,
    eatenMeals: { ...DEFAULT_EATEN_MEALS },
    customEntries: [],
  };

  const eatenMeals = currentLog.eatenMeals || DEFAULT_EATEN_MEALS;
  const customEntries = currentLog.customEntries || [];

  const persistDayLog = useCallback(
    async (
      dayIdx: number,
      nextEaten: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', boolean>,
      nextExtras: TrackerCustomEntry[]
    ) => {
      const updatedLog: DailyTrackerLog = {
        accountId: activeAccountId,
        dayIndex: dayIdx,
        date: activeDayPlan.date || toDateKey(new Date()),
        eatenMeals: nextEaten,
        customEntries: nextExtras,
      };
      setLogsByDay((prev) => ({
        ...prev,
        [dayIdx]: updatedLog,
      }));
      setSaveStatus('saving');
      try {
        await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedLog),
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Erreur sauvegarde SQLite tracker:', err);
        setSaveStatus('idle');
      }
    },
    [activeAccountId]
  );

  const toggleMeal = (key: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const nextEaten = {
      ...eatenMeals,
      [key]: !eatenMeals[key],
    };
    persistDayLog(selectedDayIndex, nextEaten, customEntries);
  };

  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraName.trim()) return;
    const newEntry: TrackerCustomEntry = {
      id: `extra_${Date.now()}`,
      name: extraName.trim(),
      calories: parseInt(extraCals) || 0,
      protein: parseInt(extraProt) || 0,
      carbs: parseInt(extraCarbs) || 0,
      fat: parseInt(extraFat) || 0,
    };
    const nextExtras = [...customEntries, newEntry];
    persistDayLog(selectedDayIndex, eatenMeals, nextExtras);
    setExtraName('');
    setExtraCals('');
    setExtraProt('');
    setExtraCarbs('');
    setExtraFat('');
  };

  const handleDeleteExtra = (entryId: string) => {
    const nextExtras = customEntries.filter((e) => e.id !== entryId);
    persistDayLog(selectedDayIndex, eatenMeals, nextExtras);
  };

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  if (eatenMeals.breakfast) {
    consumedCalories += activeDayPlan.breakfast.caloriesPerServing;
    consumedProtein += activeDayPlan.breakfast.proteinPerServing;
    consumedCarbs += activeDayPlan.breakfast.carbsPerServing;
    consumedFat += activeDayPlan.breakfast.fatPerServing;
  }
  if (eatenMeals.lunch) {
    consumedCalories += activeDayPlan.lunch.caloriesPerServing;
    consumedProtein += activeDayPlan.lunch.proteinPerServing;
    consumedCarbs += activeDayPlan.lunch.carbsPerServing;
    consumedFat += activeDayPlan.lunch.fatPerServing;
  }
  if (eatenMeals.dinner) {
    consumedCalories += activeDayPlan.dinner.caloriesPerServing;
    consumedProtein += activeDayPlan.dinner.proteinPerServing;
    consumedCarbs += activeDayPlan.dinner.carbsPerServing;
    consumedFat += activeDayPlan.dinner.fatPerServing;
  }
  if (eatenMeals.snack) {
    consumedCalories += activeDayPlan.snack.caloriesPerServing;
    consumedProtein += activeDayPlan.snack.proteinPerServing;
    consumedCarbs += activeDayPlan.snack.carbsPerServing;
    consumedFat += activeDayPlan.snack.fatPerServing;
  }

  for (const extra of customEntries) {
    consumedCalories += extra.calories;
    consumedProtein += extra.protein;
    consumedCarbs += extra.carbs || 0;
    consumedFat += extra.fat || 0;
  }

  const targetCalories = userSettings?.targetCalories ?? 3050;
  const targetProtein = userSettings?.targetProtein ?? 165;
  const targetCarbs = userSettings?.targetCarbs ?? 390;
  const targetFat = userSettings?.targetFat ?? 90;

  const calPercent = Math.min(100, Math.round((consumedCalories / Math.max(1, targetCalories)) * 100));
  const protPercent = Math.min(100, Math.round((consumedProtein / Math.max(1, targetProtein)) * 100));
  const carbsPercent = Math.min(100, Math.round((consumedCarbs / Math.max(1, targetCarbs)) * 100));
  const fatPercent = Math.min(100, Math.round((consumedFat / Math.max(1, targetFat)) * 100));

  const cardGlassClass = isDark ? 'liquid-glass' : 'liquid-glass-light';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Anneaux Métaboliques Apple Fitness+ */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-widest text-stone-700 dark:text-stone-300 font-semibold">
                Suivi Nutritionnel • {activeDayPlan.formattedFullDate || activeDayPlan.dayName}
              </span>
              {activeDayPlan.isToday && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                  Aujourd'hui
                </span>
              )}
              {isLoaded && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  <Database className="w-2.5 h-2.5" />
                  {saveStatus === 'saving'
                    ? 'Sauvegarde...'
                    : saveStatus === 'saved'
                    ? 'Enregistré ✓'
                    : 'Persistance SQLite'}
                </span>
              )}
            </div>

            <h1 className="font-serif text-2xl sm:text-4xl font-normal tracking-tight text-stone-900 dark:text-white">
              Activité & <span className="italic">Métabolisme</span>
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-2 font-sans">
              Consignez vos repas consommés en direct. Vos cases cochées et extras sont sauvegardés automatiquement pour chaque jour.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onOpenCalendar || (() => setIsHistoryModalOpen(true))}
              type="button"
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl border text-xs font-mono font-semibold transition-all cursor-pointer border-stone-300 dark:border-white/15 bg-white/70 hover:bg-stone-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-stone-900 dark:text-stone-100 shadow-xs"
              title="Ouvrir le calendrier et l'historique complet des repas enregistrés"
            >
              <Calendar className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300" />
              <span>Historique & Calendrier</span>
              {allLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                  {allLogs.length} j
                </span>
              )}
            </button>
            {protPercent >= 100 ? (
              <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-stone-900 text-stone-50 dark:bg-white dark:text-stone-950 border border-stone-800 dark:border-white text-xs font-mono font-semibold shadow-xs">
                <Trophy className="w-4 h-4 text-stone-300 dark:text-stone-700 shrink-0" />
                <span>Objectif Protéines Atteint !</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs font-mono font-semibold">
                <AlertCircle className="w-4 h-4 text-stone-600 dark:text-stone-400 shrink-0" />
                <span>Reste {Math.max(0, Math.round((targetProtein - consumedProtein) * 10) / 10)} g de protéines</span>
              </div>
            )}
          </div>
        </div>

        {/* Sélecteur de jour de la semaine */}
        {weeklyPlan?.days && weeklyPlan.days.length > 0 && (
          <div className="flex items-center gap-1.5 mt-5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mr-1 shrink-0">
              <Calendar className="w-3 h-3" /> Jour :
            </span>
            {weeklyPlan.days.map((d) => {
              const isSelected = d.dayIndex === selectedDayIndex;
              const isToday = Boolean(d.isToday);
              const dayLog = logsByDay[d.dayIndex];
              const hasActivity =
                dayLog &&
                (Object.values(dayLog.eatenMeals || {}).some(Boolean) ||
                  (dayLog.customEntries && dayLog.customEntries.length > 0));
              return (
                <button
                  key={d.date || d.dayIndex}
                  type="button"
                  onClick={() => setSelectedDayIndex(d.dayIndex)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-white text-stone-950 font-bold border-white shadow-xs'
                        : 'bg-stone-900 text-stone-50 font-bold border-stone-900 shadow-xs'
                      : isDark
                      ? 'bg-white/[0.03] border-white/10 text-stone-400 hover:text-white'
                      : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  <span className="font-semibold">{d.dayName.slice(0, 3)}</span>
                  {d.formattedDate && (
                    <span className={`text-[10px] ${isSelected ? (isDark ? 'text-stone-800' : 'text-stone-300') : 'text-stone-400'}`}>
                      {d.formattedDate.split(' ')[0]}
                    </span>
                  )}
                  {isToday && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-500 font-bold">
                      Auj
                    </span>
                  )}
                  {hasActivity && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Jauges Apple Activity Style (Monochrome & Graphite - 4 Piliers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mt-6 pt-5 sm:pt-6 border-t border-stone-200/60 dark:border-white/10">
          {/* 1. Énergie / Calories */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between font-mono mb-1.5 sm:mb-2">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold">
                <Flame className="w-3.5 h-3.5 shrink-0" /> Calories
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-stone-200">
                {calPercent}%
              </span>
            </div>
            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-white tabular-nums">
                  {Math.round(consumedCalories)}
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                  / {targetCalories} kcal
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate mt-0.5">
                {targetCalories - consumedCalories > 0
                  ? `${Math.round(targetCalories - consumedCalories)} kcal restantes`
                  : 'Cible atteinte 🎉'}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
              <div
                className="bg-stone-800 dark:bg-stone-200 h-full transition-all duration-300 rounded-full"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* 2. Protéines */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between font-mono mb-1.5 sm:mb-2">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold">
                <Dumbbell className="w-3.5 h-3.5 shrink-0" /> Protéines
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-stone-200">
                {protPercent}%
              </span>
            </div>
            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-white tabular-nums">
                  {Math.round(consumedProtein * 10) / 10}
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                  / {targetProtein}g
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate mt-0.5">
                {targetProtein - consumedProtein > 0
                  ? `${Math.round((targetProtein - consumedProtein) * 10) / 10}g restants`
                  : 'Cible atteinte 🎉'}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
              <div
                className="bg-stone-950 dark:bg-white h-full transition-all duration-300 rounded-full"
                style={{ width: `${protPercent}%` }}
              />
            </div>
          </div>

          {/* 3. Glucides */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between font-mono mb-1.5 sm:mb-2">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold">
                <Wheat className="w-3.5 h-3.5 shrink-0" /> Glucides
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-stone-200">
                {carbsPercent}%
              </span>
            </div>
            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-white tabular-nums">
                  {Math.round(consumedCarbs * 10) / 10}
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                  / {targetCarbs}g
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate mt-0.5">
                {targetCarbs - consumedCarbs > 0
                  ? `${Math.round((targetCarbs - consumedCarbs) * 10) / 10}g restants`
                  : 'Cible atteinte 🎉'}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
              <div
                className="bg-stone-600 dark:bg-stone-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${carbsPercent}%` }}
              />
            </div>
          </div>

          {/* 4. Lipides */}
          <div
            className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between ${
              isDark ? 'bg-black/30 border-white/5' : 'bg-white border-stone-200 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between font-mono mb-1.5 sm:mb-2">
              <span className="text-stone-700 dark:text-stone-300 flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold">
                <Droplet className="w-3.5 h-3.5 shrink-0" /> Lipides
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-stone-100 dark:bg-white/10 text-stone-800 dark:text-stone-200">
                {fatPercent}%
              </span>
            </div>
            <div className="my-1 sm:my-2">
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-stone-950 dark:text-white tabular-nums">
                  {Math.round(consumedFat * 10) / 10}
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-stone-500 dark:text-stone-400">
                  / {targetFat}g
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-400 dark:text-stone-500 truncate mt-0.5">
                {targetFat - consumedFat > 0
                  ? `${Math.round((targetFat - consumedFat) * 10) / 10}g restants`
                  : 'Cible atteinte 🎉'}
              </div>
            </div>
            <div className="h-1.5 sm:h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mt-1">
              <div
                className="bg-stone-500 dark:bg-stone-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${fatPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Repas du Jour */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h2 className="font-serif text-xl sm:text-2xl font-normal text-stone-900 dark:text-white mb-4">
          Repas de la Journée <span className="italic">({activeDayPlan.dayName})</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
          {/* Déjeuner */}
          <div
            onClick={() => toggleMeal('breakfast')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.breakfast
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.breakfast
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                    : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.breakfast && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Petit-déjeuner
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {activeDayPlan.breakfast.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0 gap-0.5">
              <div className="text-stone-900 dark:text-stone-100 font-semibold">
                {activeDayPlan.breakfast.caloriesPerServing} kcal
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-stone-200">
                  {activeDayPlan.breakfast.proteinPerServing}g P
                </span>{' '}
                • {activeDayPlan.breakfast.carbsPerServing}g G • {activeDayPlan.breakfast.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Dîner (Midi) */}
          <div
            onClick={() => toggleMeal('lunch')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.lunch
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.lunch
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                    : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.lunch && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Déjeuner (Midi)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {activeDayPlan.lunch.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0 gap-0.5">
              <div className="text-stone-900 dark:text-stone-100 font-semibold">
                {activeDayPlan.lunch.caloriesPerServing} kcal
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-stone-200">
                  {activeDayPlan.lunch.proteinPerServing}g P
                </span>{' '}
                • {activeDayPlan.lunch.carbsPerServing}g G • {activeDayPlan.lunch.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Souper (Soir) */}
          <div
            onClick={() => toggleMeal('dinner')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.dinner
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.dinner
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                    : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.dinner && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Dîner (Soir)
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {activeDayPlan.dinner.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0 gap-0.5">
              <div className="text-stone-900 dark:text-stone-100 font-semibold">
                {activeDayPlan.dinner.caloriesPerServing} kcal
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-stone-200">
                  {activeDayPlan.dinner.proteinPerServing}g P
                </span>{' '}
                • {activeDayPlan.dinner.carbsPerServing}g G • {activeDayPlan.dinner.fatPerServing}g L
              </div>
            </div>
          </div>

          {/* Collation */}
          <div
            onClick={() => toggleMeal('snack')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 ${
              eatenMeals.snack
                ? isDark
                  ? 'bg-white/[0.08] border-white/30 ring-1 ring-white/20'
                  : 'bg-white border-stone-800 ring-1 ring-stone-800 shadow-xs'
                : isDark
                ? 'bg-white/[0.01] border-white/5 hover:border-white/15'
                : 'bg-stone-50 border-stone-200 hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-6 h-6 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                  eatenMeals.snack
                    ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-xs'
                    : 'border-2 border-stone-400'
                }`}
              >
                {eatenMeals.snack && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-wider text-stone-600 dark:text-stone-400 font-medium">
                  Collation
                </div>
                <div className="font-serif text-sm font-medium text-stone-900 dark:text-white truncate">
                  {activeDayPlan.snack.title}
                </div>
              </div>
            </div>
            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-start pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 dark:border-white/5 font-mono tabular-nums text-xs shrink-0 gap-0.5">
              <div className="text-stone-900 dark:text-stone-100 font-semibold">
                {activeDayPlan.snack.caloriesPerServing} kcal
              </div>
              <div className="text-[11px] text-stone-600 dark:text-stone-400">
                <span className="font-semibold text-stone-900 dark:text-stone-200">
                  {activeDayPlan.snack.proteinPerServing}g P
                </span>{' '}
                • {activeDayPlan.snack.carbsPerServing}g G • {activeDayPlan.snack.fatPerServing}g L
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ajout d'extras */}
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 transition-all border ${cardGlassClass}`}>
        <h3 className="font-serif text-xl font-normal text-stone-900 dark:text-white mb-3">
          Ajouter une collation libre ou extra
        </h3>

        <form onSubmit={handleAddExtra} className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-2.5">
          <input
            type="text"
            placeholder="Nom (ex: 2 œufs durs, poignée d'amandes...)"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className={`col-span-2 sm:col-span-2 px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Calories (kcal)"
            value={extraCals}
            onChange={(e) => setExtraCals(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Prot (g)"
            value={extraProt}
            onChange={(e) => setExtraProt(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Gluc (g)"
            value={extraCarbs}
            onChange={(e) => setExtraCarbs(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <input
            type="number"
            placeholder="Lip (g)"
            value={extraFat}
            onChange={(e) => setExtraFat(e.target.value)}
            className={`px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-stone-500 ${
              isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-stone-300 text-stone-900'
            }`}
          />
          <div className="col-span-2 sm:col-span-6 flex justify-end">
            <button
              type="submit"
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer ${
                isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
              }`}
            >
              Enregistrer
            </button>
          </div>
        </form>

        {customEntries.length > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-200/50 dark:border-white/10 space-y-2">
            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
              Extras enregistrés ({activeDayPlan.dayName}) :
            </span>
            {customEntries.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between items-center text-xs p-2.5 rounded-xl border font-mono ${
                  isDark ? 'bg-white/[0.02] border-white/5' : 'bg-white border-stone-200 shadow-xs'
                }`}
              >
                <span className="text-stone-900 dark:text-white">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-stone-700 dark:text-stone-300 tabular-nums font-semibold">
                    +{item.calories} kcal • +{item.protein}g P • +{item.carbs || 0}g G • +{item.fat || 0}g L
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExtra(item.id)}
                    className="p-1 text-stone-400 hover:text-red-500 transition-colors cursor-pointer"
                    title="Supprimer cet extra"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isHistoryModalOpen && (
        <CalendarModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          accountId={activeAccountId}
          isDark={isDark}
          userSettings={userSettings}
          activeDateKey={activeDayPlan.date}
          onSelectDate={(dateKey) => {
            const foundDayIdx = weeklyPlan?.days.findIndex((d) => d.date === dateKey);
            if (foundDayIdx !== undefined && foundDayIdx >= 0) {
              setSelectedDayIndex(foundDayIdx);
            }
          }}
        />
      )}
    </div>
  );
};

export const CalorieTrackerView = React.memo(CalorieTrackerViewComponent);
