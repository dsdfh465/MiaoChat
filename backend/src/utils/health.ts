/**
 * @fileoverview 健康检查响应构建，供 /health 接口与单元测试复用
 * @module utils/health
 */

export interface HealthResponse {
  status: 'ok';
  service: 'miaochat-backend';
  version: string;
}

/**
 * 构建健康检查 JSON 响应体
 *
 * @returns 固定结构的服务状态
 * @example
 * // GET /health
 * // {"status":"ok","service":"miaochat-backend","version":"1.0.0"}
 */
export function buildHealthResponse(): HealthResponse {
  return {
    status: 'ok',
    service: 'miaochat-backend',
    version: '1.0.0',
  };
}
