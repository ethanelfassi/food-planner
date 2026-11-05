/**
 * Utilitaires de dates en français pour FoodPlanner
 * Conçu pour préserver les fuseaux horaires locaux et le cycle de la semaine québécoise (Lundi à Dimanche)
 */

export const DAY_NAMES = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
] as const;

export const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

export const MONTH_NAMES_FULL = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
] as const;

export const MONTH_NAMES_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
] as const;

/**
 * Convertit une Date en clé de date standardisée 'YYYY-MM-DD' en heure locale
 */
export function toDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Crée un objet Date à midi (12:00) à partir d'une clé 'YYYY-MM-DD'
 * Midi prévient tout saut de date lié au passage à l'heure d'hiver/été.
 */
export function parseDateKey(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = Number(yearStr) || new Date().getFullYear();
  const month = (Number(monthStr) || 1) - 1;
  const day = Number(dayStr) || 1;
  return new Date(year, month, day, 12, 0, 0);
}

/**
 * Récupère le lundi de la semaine d'une date donnée (à midi)
 */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

/**
 * Ajoute un nombre de jours à une Date
 */
export function addDays(date: Date, days: number): Date {
  const res = new Date(date);
  res.setDate(res.getDate() + days);
  return res;
}

/**
 * Ajoute un nombre de semaines à une Date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Calcule l'indice 0..6 (0 = Lundi, 6 = Dimanche)
 */
export function getDayIndex(date: Date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

export interface WeekDayInfo {
  dayIndex: number;
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Jeudi"
  dayShort: string; // "Jeu"
  dayNumber: number; // 5
  monthShort: string; // "nov."
  monthFull: string; // "novembre"
  formattedShort: string; // "5 nov."
  formattedFull: string; // "Jeudi 5 novembre 2026"
  isToday: boolean;
}

/**
 * Génère les 7 jours de la semaine commençant par le lundi spécifié
 */
export function getWeekDays(mondayDate: Date = getMondayOfWeek()): WeekDayInfo[] {
  const todayKey = toDateKey(new Date());
  const monday = getMondayOfWeek(mondayDate);

  const days: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const dateStr = toDateKey(d);
    const dayNumber = d.getDate();
    const monthIdx = d.getMonth();
    const monthShort = MONTH_NAMES_SHORT[monthIdx];
    const monthFull = MONTH_NAMES_FULL[monthIdx];
    const dayName = DAY_NAMES[i];
    const dayShort = DAY_NAMES_SHORT[i];

    days.push({
      dayIndex: i,
      dateStr,
      dayName,
      dayShort,
      dayNumber,
      monthShort,
      monthFull,
      formattedShort: `${dayNumber} ${monthShort}`,
      formattedFull: `${dayName} ${dayNumber} ${monthFull} ${d.getFullYear()}`,
      isToday: dateStr === todayKey,
    });
  }
  return days;
}

/**
 * Formate une plage de semaine en français
 * Ex : "Semaine du 2 au 8 novembre 2026" ou "Semaine du 28 oct. au 3 nov. 2026"
 */
export function formatWeekRangeFrench(mondayDate: Date = getMondayOfWeek()): string {
  const monday = getMondayOfWeek(mondayDate);
  const sunday = addDays(monday, 6);

  const mMonth = monday.getMonth();
  const sMonth = sunday.getMonth();
  const mYear = monday.getFullYear();
  const sYear = sunday.getFullYear();

  if (mMonth === sMonth && mYear === sYear) {
    return `Semaine du ${monday.getDate()} au ${sunday.getDate()} ${MONTH_NAMES_FULL[mMonth]} ${sYear}`;
  }

  if (mYear === sYear) {
    return `Semaine du ${monday.getDate()} ${MONTH_NAMES_SHORT[mMonth]} au ${sunday.getDate()} ${MONTH_NAMES_SHORT[sMonth]} ${sYear}`;
  }

  return `Semaine du ${monday.getDate()} ${MONTH_NAMES_SHORT[mMonth]} ${mYear} au ${sunday.getDate()} ${MONTH_NAMES_SHORT[sMonth]} ${sYear}`;
}

/**
 * Formate une date en format court français pour un badge
 * Ex: "Aujourd'hui, 5 nov." ou "Jeu 5 nov."
 */
export function formatHeaderDateFrench(date: Date = new Date()): string {
  const dayName = DAY_NAMES[getDayIndex(date)];
  const dayNum = date.getDate();
  const monthName = MONTH_NAMES_SHORT[date.getMonth()];
  return `${dayName} ${dayNum} ${monthName}`;
}
