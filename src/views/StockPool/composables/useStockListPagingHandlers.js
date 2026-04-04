import { applySearchParamsFromStockList } from '../utils/stockPoolSearchParams';

/**
 * StockList 分页与搜索与父级 searchParams / reload 对齐，避免三页重复样板代码
 */
export function useStockListPagingHandlers({ page, searchParams, reload }) {
  const handlePageChange = (newPage) => {
    page.pageNo = newPage;
    reload();
  };

  const handlePageSizeChange = (newPageSize) => {
    page.pageSize = newPageSize;
    page.pageNo = 1;
    reload();
  };

  // 第二个参数保留与子组件 @search 签名兼容（当前 applySearchParamsFromStockList 未使用）
  const handleSearchEvent = (searchParamsFromChild, _options) => {
    applySearchParamsFromStockList(searchParams, searchParamsFromChild);
    page.pageNo = 1;
    reload();
  };

  return {
    handlePageChange,
    handlePageSizeChange,
    handleSearchEvent,
  };
}
