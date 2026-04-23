/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Formats a decimal number of hours or a number of minutes into the requested string format.
 * If total minutes < 60, shows only "X min".
 * If total minutes >= 60, shows "Hh Mmin" (e.g. 1h 10min).
 * 
 * @param hours Decimal hours (e.g., 1.5)
 * @returns Formatted string
 */
export function formatTimeDisplay(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  
  if (totalMinutes === 0) return '0 min';
  
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  
  if (m === 0) return `${h}h`;
  
  return `${h}h ${m}min`;
}

/**
 * Bonus calculation:
 * 2 days of leave per year (8h each = 16h total).
 * 16 hours = 960 minutes.
 * 365 days.
 * 960 / 365 = 2.63 minutes per day.
 */
export const FEEDBACK_BONUS_MINUTES = 2.63;
