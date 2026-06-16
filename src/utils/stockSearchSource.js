import { getLocalString, setLocal } from '@/utils/storage';

export const STOCK_SEARCH_SOURCE_STORAGE_KEY = 'stock-search-source';
export const DEFAULT_STOCK_SEARCH_SOURCE = 'auto';

export const STOCK_SEARCH_SOURCE_OPTIONS = [
  {
    value: 'auto',
    label: '自动切换',
    badge: '推荐',
    description: '优先使用百度搜索，失败时自动回退到 AKShare，适合日常使用。',
  },
  {
    value: 'baidu',
    label: '百度搜索',
    badge: '即时',
    description:
      '直接使用百度财经模糊搜索，名称、代码、拼音匹配体验更接近线上搜索。',
  },
  {
    value: 'akshare',
    label: 'AKShare',
    badge: '稳态',
    description: '使用 AKShare 本地索引搜索，支持 A 股、港股、美股与拼音索引。',
  },
];

const VALID_SOURCES = new Set(
  STOCK_SEARCH_SOURCE_OPTIONS.map((item) => item.value)
);

// 统一规范股票搜索数据源，避免本地脏值影响请求。
export function normalizeStockSearchSource(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (VALID_SOURCES.has(normalized)) {
    return normalized;
  }
  return DEFAULT_STOCK_SEARCH_SOURCE;
}

// 获取当前浏览器持久化的搜索源配置。
export function getStockSearchSource() {
  return normalizeStockSearchSource(
    getLocalString(STOCK_SEARCH_SOURCE_STORAGE_KEY)
  );
}

// 保存搜索源配置，并返回最终生效值。
export function setStockSearchSource(value) {
  const normalized = normalizeStockSearchSource(value);
  setLocal(STOCK_SEARCH_SOURCE_STORAGE_KEY, normalized);
  return normalized;
}

// 生成股票搜索接口参数，统一附带当前配置的数据源。
export function buildStockSearchParams(search, onlyA = false, limit = 20) {
  return {
    query: search,
    only_a: onlyA,
    limit,
    source: getStockSearchSource(),
  };
}
