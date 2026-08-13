/**
 * @fileoverview 结构化日志工具，禁止输出密码、手机号、Token 等敏感信息
 * @module utils/logger
 */

type LogMeta = Record<string, unknown>;

/**
 * 将未知异常转换为可记录的安全文本
 *
 * @param error - 捕获到的异常
 * @returns 用于日志的错误描述
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export const logger = {
  /**
   * 输出绿色成功日志
   *
   * @param message - 成功文案
   */
  success(message: string): void {
    console.log(`\x1b[32m🟢 ${message}\x1b[0m`);
  },

  /**
   * 输出普通信息日志
   *
   * @param message - 信息文案
   * @param meta - 可选上下文（不得包含敏感字段）
   */
  info(message: string, meta?: LogMeta): void {
    if (meta) {
      console.log(message, meta);
      return;
    }
    console.log(message);
  },

  /**
   * 输出错误日志，不打印敏感信息
   *
   * @param message - 错误摘要
   * @param meta - 可选上下文，error 字段会被安全格式化
   */
  error(message: string, meta?: LogMeta): void {
    if (!meta) {
      console.error(message);
      return;
    }
    const { error, ...rest } = meta;
    console.error(message, {
      ...rest,
      ...(error !== undefined ? { error: formatError(error) } : {}),
    });
  },
};
