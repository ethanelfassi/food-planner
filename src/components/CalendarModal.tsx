'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Activity,
  Flame,
  Dumbbell,
  Check,
  Award,
  Sparkles,
} from 'lucide-react';
import { DailyTrackerLog, UserCustomizationSettings } from '@/types';
import {
  MONTH_NAMES_FULL,
  DAY_NAMES_SHORT,
  DAY_NAMES,
  toDateKey,
  parseDateKey,
  getMonthCalendarDays,
  MonthCalendarDay,
} from '@/lib/date-utils';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  isDark: boolean;
  userSettings?: UserCustomizationSettings;
  activeDateKey?: string;
  onSelectDate: (dateKey: string, date: Date) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  accountId,
  isDark,
  userSettings,
  activeDateKey,
  onSelectDate,
}) => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar');
  const [allLogs, setAllLogs] = useState<DailyTrackerLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mois affiché dans le calendrier (date déterministe pour prerender Next.js)
  const [viewDate, setViewDate] = useState<Date>(() => new Date(2026, 10, 1, 12, 0, 0));
  // Date inspectée dans le panneau de détails du calendrier
  const [inspectedDateKey, setInspectedDateKey] = useState<string>(() => activeDateKey || '2026-11-05');
  const [todayKey, setTodayKey] = useState<string>('');

  // Charger l'historique complet pour ce compte
  const loadHistory = useCallback(async () => {
    if (!accountId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tracker?accountId=${encodeURIComponent(accountId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.logs)) {
          setAllLogs(data.logs);
        }
      }
    } catch (err) {
      console.error('Erreur chargement historique calendrier:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    const today = toDateKey(new Date());
    setTodayKey(today);
    if (isOpen) {
      loadHistory();
      const initialKey = activeDateKey || today;
      setInspectedDateKey(initialKey);
      setViewDate(parseDateKey(initialKey));
    }
  }, [isOpen, activeDateKey, loadHistory]);

  // Indexer les logs par dateKey pour lookup instantané
  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyTrackerLog>();
    for (const log of allLogs) {
      if (log.date) {
        map.set(log.date, log);
      }
    }
    return map;
  }, [allLogs]);

  // Statistiques globales
  const stats = useMemo(() => {
    if (allLogs.length === 0) return { totalDays: 0, avgCals: 0, avgProt: 0 };
    let totalCals = 0;
    let totalProt = 0;
    allLogs.forEach((l) => {
      totalCals += l.totalCaloriesEaten || 0;
      totalProt += l.totalProteinEaten || 0;
    });
    return {
      totalDays: allLogs.length,
      avgCals: Math.round(totalCals / allLogs.length),
      avgProt: Math.round((totalProt / allLogs.length) * 10) / 10,
    };
  }, [allLogs]);

  // Cellules du mois actuel
  const monthDays = useMemo(() => {
    return getMonthCalendarDays(viewDate.getFullYear(), viewDate.getMonth(), todayKey);
  }, [viewDate, todayKey]);

  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1, 12, 0, 0));
  };

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1, 12, 0, 0));
  };

  const handleToday = () => {
    const now = new Date();
    setViewDate(now);
    setInspectedDateKey(toDateKey(now));
  };

  const inspectedLog = logsByDate.get(inspectedDateKey);
  const targetCals = userSettings?.targetCalories ?? 2500;
  const targetProt = userSettings?.targetProtein ?? 150;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? 'bg-stone-950 border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête du Modal */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200/60 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-white/10 text-white' : 'bg-stone-900 text-stone-50'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-normal">Calendrier & Historique</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
                Consultez vos repas passés, votre journal et naviguez directement à n'importe quelle date.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Fermer"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sélecteur d'onglets (Vue Calendrier vs Journal Chronologique) */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 pb-2 border-b border-stone-200/50 dark:border-white/5 bg-stone-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('calendar')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? isDark
                    ? 'bg-white text-stone-950 shadow-md'
                    : 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Vue Calendrier</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? isDark
                    ? 'bg-white text-stone-950 shadow-md'
                    : 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/5'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Journal des repas</span>
              {allLogs.length > 0 && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'history'
                      ? isDark
                        ? 'bg-stone-900 text-white'
                        : 'bg-white text-stone-950'
                      : 'bg-stone-200 dark:bg-white/10 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {allLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Cibles rapides */}
          <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-stone-500 dark:text-stone-400">
            <span>Cible : {targetCals} kcal</span>
            <span>•</span>
            <span>{targetProt}g P</span>
          </div>
        </div>

        {/* Corps du Modal avec Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'calendar' ? (
            /* VUE CALENDRIER MENSUEL */
            <div className="space-y-4">
              {/* Contrôles du mois */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-lg sm:text-xl font-medium">
                    {MONTH_NAMES_FULL[viewDate.getMonth()]} {viewDate.getFullYear()}
                  </h3>
                  <button
                    onClick={handleToday}
                    type="button"
                    className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-lg border border-stone-300 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-stone-300 font-semibold cursor-pointer"
                  >
                    Aujourd'hui
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevMonth}
                    type="button"
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Mois précédent"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    type="button"
                    className="p-1.5 rounded-xl border border-stone-200 dark:border-white/10 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="Mois suivant"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grille du calendrier (Lundi à Dimanche) */}
              <div className="border border-stone-200 dark:border-white/10 rounded-2xl overflow-hidden">
                {/* En-tête des jours */}
                <div className="grid grid-cols-7 bg-stone-100/70 dark:bg-white/[0.03] border-b border-stone-200 dark:border-white/10 text-center py-2">
                  {DAY_NAMES_SHORT.map((name) => (
                    <div key={name} className="font-mono text-[11px] uppercase tracking-wider font-semibold text-stone-600 dark:text-stone-400">
                      {name}
                    </div>
                  ))}
                </div>

                {/* Cellules des jours */}
                <div className="grid grid-cols-7 divide-x divide-y divide-stone-200/60 dark:divide-white/5">
                  {monthDays.map((cell: MonthCalendarDay) => {
                    const log = logsByDate.get(cell.dateKey);
                    const isInspected = inspectedDateKey === cell.dateKey;
                    const hasLog = Boolean(log && ((log.totalCaloriesEaten || 0) > 0 || (log.customEntries?.length || 0) > 0));

                    return (
                      <button
                        key={cell.dateKey}
                        onClick={() => setInspectedDateKey(cell.dateKey)}
                        type="button"
                        className={`relative p-2 sm:p-2.5 min-h-[58px] sm:min-h-[70px] text-left transition-all flex flex-col justify-between group cursor-pointer ${
                          isInspected
                            ? isDark
                              ? 'bg-white/15 ring-2 ring-emerald-500'
                              : 'bg-stone-100 ring-2 ring-stone-900'
                            : !cell.isCurrentMonth
                            ? 'opacity-35 bg-stone-50/50 dark:bg-black/20'
                            : isDark
                            ? 'hover:bg-white/[0.04]'
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                              cell.isToday
                                ? 'bg-emerald-500 text-white font-bold'
                                : isInspected
                                ? isDark
                                  ? 'text-white'
                                  : 'text-stone-950 font-bold'
                                : 'text-stone-700 dark:text-stone-300'
                            }`}
                          >
                            {cell.dayNumber}
                          </span>

                          {hasLog && (
                            <span
                              className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-black"
                              title="Repas enregistrés"
                            />
                          )}
                        </div>

                        {log && (log.totalCaloriesEaten || 0) > 0 ? (
                          <div className="mt-1 font-mono text-[9px] sm:text-[10px] tabular-nums text-stone-500 dark:text-stone-400 truncate">
                            <span className="font-semibold text-stone-900 dark:text-white">
                              {log.totalCaloriesEaten}
                            </span>{' '}
                            kcal
                          </div>
                        ) : (
                          <div className="h-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Panneau de détails du jour inspecté */}
              {inspectedDateKey && (
                <div
                  className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500 font-semibold">
                          Détails du jour
                        </span>
                        {todayKey && inspectedDateKey === todayKey && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif text-base sm:text-lg font-normal mt-0.5">
                        {DAY_NAMES[parseDateKey(inspectedDateKey).getDay() === 0 ? 6 : parseDateKey(inspectedDateKey).getDay() - 1]}{' '}
                        {parseDateKey(inspectedDateKey).getDate()}{' '}
                        {MONTH_NAMES_FULL[parseDateKey(inspectedDateKey).getMonth()]}{' '}
                        {parseDateKey(inspectedDateKey).getFullYear()}
                      </h4>
                    </div>

                    <button
                      onClick={() => {
                        onSelectDate(inspectedDateKey, parseDateKey(inspectedDateKey));
                        onClose();
                      }}
                      type="button"
                      className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isDark ? 'bg-white text-stone-950 hover:bg-stone-200' : 'bg-stone-900 text-stone-50 hover:bg-stone-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Afficher dans le planificateur</span>
                    </button>
                  </div>

                  {/* Macros de ce jour */}
                  {inspectedLog ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 pt-3 border-t border-stone-200/60 dark:border-white/10">
                      <div className="p-2.5 rounded-xl border border-stone-200/50 dark:border-white/5 bg-white/60 dark:bg-black/30">
                        <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Énergie
                        </div>
                        <div className="font-mono tabular-nums text-sm font-semibold mt-0.5">
                          {inspectedLog.totalCaloriesEaten || 0} / {targetCals} kcal
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-stone-200/50 dark:border-white/5 bg-white/60 dark:bg-black/30">
                        <div className="text-[10px] font-mono text-stone-500 flex items-center gap-1">
                          <Dumbbell className="w-3 h-3 text-stone-700 dark:text-stone-300" /> Protéines
                        </div>
                        <div className="font-mono tabular-nums text-sm font-semibold mt-0.5">
                          {inspectedLog.totalProteinEaten || 0} / {targetProt} g
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-stone-200/50 dark:border-white/5 bg-white/60 dark:bg-black/30">
                        <div className="text-[10px] font-mono text-stone-500">Repas cochés</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => {
                            const isEaten = Boolean(inspectedLog.eatenMeals?.[m as keyof typeof inspectedLog.eatenMeals]);
                            return (
                              <span
                                key={m}
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  isEaten
                                    ? 'bg-emerald-500 text-white font-bold'
                                    : 'bg-stone-200 dark:bg-white/10 text-stone-400'
                                }`}
                                title={m}
                              >
                                {m[0].toUpperCase()}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-xl border border-stone-200/50 dark:border-white/5 bg-white/60 dark:bg-black/30">
                        <div className="text-[10px] font-mono text-stone-500">Extras libres</div>
                        <div className="font-mono text-xs font-semibold mt-1">
                          {inspectedLog.customEntries?.length || 0} extra(s)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 pt-3 border-t border-stone-200/60 dark:border-white/10 text-xs text-stone-500 font-sans">
                      Aucun repas n'a encore été coché pour cette date. Cliquez sur « Afficher dans le planificateur » pour préparer ou enregistrer ce jour.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* VUE JOURNAL / HISTORIQUE CHRONOLOGIQUE */
            <div className="space-y-4">
              {/* Synthèse globale */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="text-xs font-mono uppercase text-stone-500">Jours journalisés</div>
                  <div className="font-mono text-2xl font-bold mt-1">{stats.totalDays}</div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Historique perpétuel actif</div>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="text-xs font-mono uppercase text-stone-500">Moyenne Calories</div>
                  <div className="font-mono text-2xl font-bold mt-1">
                    {stats.avgCals} <span className="text-xs font-normal">kcal/j</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Cible : {targetCals} kcal</div>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="text-xs font-mono uppercase text-stone-500">Moyenne Protéines</div>
                  <div className="font-mono text-2xl font-bold mt-1">
                    {stats.avgProt} <span className="text-xs font-normal">g/j</span>
                  </div>
                  <div className="text-[11px] text-stone-400 mt-0.5">Cible : {targetProt} g</div>
                </div>
              </div>

              {/* Liste chronologique */}
              <div className="space-y-2">
                <h4 className="font-mono text-xs uppercase tracking-wider text-stone-500 font-semibold px-1">
                  Tous les jours enregistrés ({allLogs.length})
                </h4>

                {allLogs.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-sm">
                    Aucun historique enregistré pour l'instant. Vos repas et extras cochés dans le Tracker apparaîtront automatiquement ici.
                  </div>
                ) : (
                  allLogs.map((log) => {
                    const dateObj = log.date ? parseDateKey(log.date) : null;
                    const cals = log.totalCaloriesEaten || 0;
                    const prot = log.totalProteinEaten || 0;
                    const calsPercent = Math.min(100, Math.round((cals / Math.max(1, targetCals)) * 100));
                    const protPercent = Math.min(100, Math.round((prot / Math.max(1, targetProt)) * 100));

                    return (
                      <div
                        key={log.date || log.dayIndex}
                        className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          isDark ? 'bg-white/[0.02] border-white/5 hover:border-white/20' : 'bg-stone-50 border-stone-200 hover:border-stone-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-medium text-sm sm:text-base text-stone-900 dark:text-white">
                              {dateObj
                                ? `${DAY_NAMES[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]} ${dateObj.getDate()} ${
                                    MONTH_NAMES_FULL[dateObj.getMonth()]
                                  } ${dateObj.getFullYear()}`
                                : `Jour ${log.dayIndex + 1}`}
                            </span>
                            {todayKey && log.date === todayKey && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                                Aujourd'hui
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-mono text-stone-500 mt-1">
                            <span>
                              <strong className="text-stone-900 dark:text-stone-200">{cals}</strong> kcal ({calsPercent}%)
                            </span>
                            <span>•</span>
                            <span>
                              <strong className="text-stone-900 dark:text-stone-200">{prot}g</strong> prot ({protPercent}%)
                            </span>
                            {log.customEntries && log.customEntries.length > 0 && (
                              <>
                                <span>•</span>
                                <span>{log.customEntries.length} extra(s)</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => {
                              if (log.date) {
                                onSelectDate(log.date, parseDateKey(log.date));
                                onClose();
                              }
                            }}
                            type="button"
                            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-white/10 hover:bg-stone-200/60 dark:hover:bg-white/10 font-mono text-xs font-semibold cursor-pointer"
                          >
                            Consulter ce jour
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
