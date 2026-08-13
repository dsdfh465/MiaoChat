/**
 * @fileoverview 金额工具：分与元的换算，避免浮点误差
 * @module utils/money
 */

/**
 * 将以分为单位的整数格式化为元字符串
 *
 * @param amountInCents - 金额（分）
 * @returns 保留两位小数的元字符串，如 "25.00"
 */
export function formatYuan(amountInCents: number): string {
  const sign = amountInCents < 0 ? '-' : '';
  const abs = Math.abs(amountInCents);
  const yuan = Math.floor(abs / 100);
  const cents = abs % 100;
  return `${sign}${yuan}.${cents.toString().padStart(2, '0')}`;
}

/**
 * 将账目记录转为 API 视图（附加 amount_yuan）
 *
 * @param record - 仓储层交易记录
 * @returns 接口返回结构
 */
export function toTransactionView(
  record: {
    id: string;
    user_id: string;
    category_id: string;
    category_name: string;
    category_icon: string;
    amount: number;
    note: string | null;
    recorded_at: string;
    source: 'voice' | 'manual' | 'import';
    is_confirmed: boolean;
  },
): {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  amount: number;
  amount_yuan: string;
  note: string | null;
  recorded_at: string;
  source: 'voice' | 'manual' | 'import';
  is_confirmed: boolean;
} {
  return {
    id: record.id,
    user_id: record.user_id,
    category_id: record.category_id,
    category_name: record.category_name,
    category_icon: record.category_icon,
    amount: record.amount,
    amount_yuan: formatYuan(record.amount),
    note: record.note,
    recorded_at: record.recorded_at,
    source: record.source,
    is_confirmed: record.is_confirmed,
  };
}
