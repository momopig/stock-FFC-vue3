import { calculateDaysAdded } from '@/utils/time';
import { mapQuoteToFlatRowFields } from './stockQuoteFields';

/**
 * 策略池 / 重点观察等「股票池列表接口」返回行 → 表格行（与分组内 getGroupStocks 行结构不同）
 * @param {object} stock 接口单条
 * @param {{ snapshotDate?: string }} opts snapshot_date 用于计算加入天数
 */
export function flattenPoolStockRow(stock, opts = {}) {
  const snapshotDate = opts.snapshotDate ?? '';
  const quote = stock?.quote || {};
  const initialPrice = stock.initial_price ? Number(stock.initial_price) : null;

  const mappedStock = {
    id: stock.id,
    stock_code: stock.stock_code || '',
    stock_name: stock.stock_name || '',
    exchange_code: stock.exchange_code || '',
    add_method: stock.add_method || '',
    add_time: stock.add_time || '',
    initial_price: initialPrice,
    add_reason: stock.add_reason || '',
    strategy_name: stock.strategy_name || '',
    is_self_selected: stock.is_self_selected || false,
    created_by: stock.created_by || '',
    status: stock.status || 'active',
    priority_level: stock.priority_level || null,
    notes: stock.notes || '',
    updated_time: stock.updated_time || '',
    statusLoading: false,
    ...mapQuoteToFlatRowFields(quote, initialPrice),
  };

  if (mappedStock.add_time) {
    mappedStock.days_added = calculateDaysAdded(
      mappedStock.add_time,
      snapshotDate
    );
  }

  return mappedStock;
}
