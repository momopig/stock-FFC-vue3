/**
 * 与 StockList 搜索事件对齐，统一写入 reactive searchParams
 */
export function applySearchParamsFromStockList(searchParams, fromChild) {
  if (fromChild) {
    Object.assign(searchParams, {
      stock_code: fromChild.stock_code || '',
      stock_name: fromChild.stock_name || '',
      exchange_code: fromChild.exchange_code || '',
      strategy_name: fromChild.strategy_name || '',
      snapshot_date: fromChild.snapshot_date || '',
    });
  } else {
    Object.assign(searchParams, {
      stock_code: '',
      stock_name: '',
      exchange_code: '',
      strategy_name: '',
      snapshot_date: '',
    });
  }
}
