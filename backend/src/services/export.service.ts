/**
 * @fileoverview 交易数据导出：生成带 UTF-8 BOM 的 CSV，供用户主动下载
 * @module services/export.service
 */

import { transactionRepository } from '../repositories/transaction.repository';
import { TransactionQuery, TransactionRecord, TransactionRepository } from '../types/transaction.types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import { formatYuan } from '../utils/money';

export const CSV_BOM = '\uFEFF';

export const CSV_HEADER = [
  '记账时间',
  '分类',
  '分类图标',
  '金额（元）',
  '备注',
  '来源',
  '确认状态',
  '类型',
  '交易ID',
].join(',');

const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_ROWS = 5000;

/**
 * 按 RFC 4180 转义 CSV 字段
 *
 * @param value - 原始字段
 * @returns 可安全写入 CSV 的字段
 */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 将 ISO 时间格式化为 YYYY-MM-DD HH:mm:ss（UTC 时钟，与示例一致）
 *
 * @param iso - ISO 时间字符串
 * @returns 本地化展示用时间
 */
export function formatCsvDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 生成导出文件名：miaochat_export_YYYY-MM-DD.csv
 *
 * @param now - 导出时刻
 * @returns 附件文件名
 */
export function buildExportFilename(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `miaochat_export_${year}-${month}-${day}.csv`;
}

/**
 * 将一笔交易转为 CSV 行（9 列）
 *
 * @param record - 交易记录
 * @returns CSV 行
 */
export function toCsvRow(record: TransactionRecord): string {
  const cells = [
    formatCsvDateTime(record.recorded_at),
    record.category_name || '未分类',
    record.category_icon || '',
    formatYuan(record.amount),
    record.note ?? '',
    record.source || 'manual',
    record.is_confirmed ? '已确认' : '未确认',
    record.amount > 0 ? '支出' : '收入',
    record.id,
  ];
  return cells.map(escapeCsvField).join(',');
}

/**
 * 创建导出服务，便于单元测试注入 Repository
 *
 * @param transactions - 交易数据访问实现
 * @returns 导出方法
 */
export function createExportService(transactions: TransactionRepository): {
  exportTransactionsToCSV(
    userId: string,
    query: { month?: string; categoryId?: string },
  ): Promise<string>;
} {
  return {
    /**
     * 导出用户交易为 CSV 字符串（含 UTF-8 BOM）
     *
     * @param userId - 用户 UUID
     * @param query - 可选月份与分类筛选
     * @returns CSV 文本，首字符为 BOM
     */
    async exportTransactionsToCSV(
      userId: string,
      query: { month?: string; categoryId?: string },
    ): Promise<string> {
      try {
        const records = await loadTransactionsForExport(transactions, userId, query);
        const rows = [CSV_HEADER, ...records.map(toCsvRow)];
        logger.info('Transactions exported', { userId, count: records.length });
        return `${CSV_BOM}${rows.join('\n')}`;
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error('Failed to export transactions', { userId, error });
        throw new AppError(50002, '导出生成失败', 500);
      }
    },
  };
}

/**
 * 分页拉取导出所需交易，上限 5000 条以控制内存
 *
 * @param transactions - 交易仓储
 * @param userId - 用户 UUID
 * @param query - 筛选条件
 * @returns 交易列表，按 recorded_at DESC
 */
async function loadTransactionsForExport(
  transactions: TransactionRepository,
  userId: string,
  query: { month?: string; categoryId?: string },
): Promise<TransactionRecord[]> {
  const collected: TransactionRecord[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (collected.length < EXPORT_MAX_ROWS && collected.length < total) {
    const pageQuery: TransactionQuery = {
      month: query.month,
      categoryId: query.categoryId,
      limit: EXPORT_PAGE_SIZE,
      offset,
    };
    const page = await transactions.findByUser(userId, pageQuery);
    total = page.total;
    if (page.items.length === 0) {
      break;
    }
    collected.push(...page.items);
    offset += page.items.length;
  }

  if (total > EXPORT_MAX_ROWS) {
    logger.info('Export truncated to max rows', { userId, total, max: EXPORT_MAX_ROWS });
  }

  return collected.slice(0, EXPORT_MAX_ROWS);
}

export const exportService = createExportService(transactionRepository);
