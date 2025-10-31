/**
 * Repository Index
 *
 * 모든 repository를 중앙에서 export
 */

// Base
export * from './base-repository';

// Repositories
export * from './complex.repository';
export * from './article.repository';
export * from './crawl-history.repository';
export * from './alert.repository';

// Singleton instances
import { complexRepository } from './complex.repository';
import { articleRepository } from './article.repository';
import { crawlHistoryRepository } from './crawl-history.repository';
import { alertRepository } from './alert.repository';

export {
  complexRepository,
  articleRepository,
  crawlHistoryRepository,
  alertRepository,
};
