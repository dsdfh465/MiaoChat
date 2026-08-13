/**
 * @fileoverview 数据导出控制器，将交易导出为带 UTF-8 BOM 的 CSV 附件
 * @module controllers/export.controller
 *
 * @example 请求 GET /api/v1/transactions/export?month=2026-08
 * Header: x-user-id: uuid
 * @example 响应头
 * Content-Type: text/csv; charset=utf-8
 * Content-Disposition: attachment; filename="miaochat_export_2026-08-13.csv"
 */

import { NextFunction, Request, Response } from 'express';
import { exportQuerySchema } from '../schemas/user.schema';
import { buildExportFilename, exportService } from '../services/export.service';
import { UserRecord } from '../types/user.types';
import { AppError } from '../utils/app-error';

/**
 * 从请求中取出已鉴权用户
 *
 * @param req - Express 请求
 * @returns 当前用户
 */
function requireUser(req: Request): UserRecord {
  if (!req.user) {
    throw new AppError(40101, '未提供用户标识', 401);
  }
  return req.user;
}

/**
 * 导出交易 CSV
 *
 * @param req - Express 请求
 * @param res - Express 响应
 * @param next - 错误处理回调
 * @returns Promise<void>
 */
export async function exportTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = requireUser(req);
    const parsed = exportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      throw new AppError(40004, firstIssue?.message ?? '导出参数无效', 400);
    }

    const csv = await exportService.exportTransactionsToCSV(user.id, {
      month: parsed.data.month,
      categoryId: parsed.data.category_id,
    });
    const filename = buildExportFilename();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}
