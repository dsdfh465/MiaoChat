/**
 * @fileoverview 月份区间工具，将 YYYY-MM 转为 UTC 起止时间
 * @module utils/month-range
 */

/**
 * 解析 YYYY-MM 为当月 UTC 起止时间（含起不含止）
 *
 * @param month - 月份字符串，如 2026-08
 * @returns ISO 起止时间
 */
export function getMonthRange(month: string): { startIso: string; endIso: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match || match[1] === undefined || match[2] === undefined) {
    throw new Error('Invalid month');
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

/**
 * 将 YYYY-MM 转为 DATE 列使用的月初日期
 *
 * @param month - 月份字符串，如 2026-09
 * @returns 月初日期，如 2026-09-01
 */
export function toMonthDate(month: string): string {
  return `${month}-01`;
}

/**
 * 从 DATE/ISO 字符串提取 YYYY-MM
 *
 * @param dateValue - 日期或时间戳字符串
 * @returns 月份字符串
 */
export function formatYearMonth(dateValue: string): string {
  return dateValue.slice(0, 7);
}
