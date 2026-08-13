/// 本地 SQLite 缓存预留，本任务不实现读写。
library;

/// 本地数据库服务占位
class LocalDbService {
  LocalDbService._();

  /// 单例
  static final LocalDbService instance = LocalDbService._();
}
