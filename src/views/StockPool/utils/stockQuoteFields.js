/**
 * 将行情 quote 与成本价转为表格行扁平字段（策略池 / 自选池列表行结构一致部分），扁平好像是因为之前有个排序的bug，需要扁平化才能自动排序
 */
export function mapQuoteToFlatRowFields(quote, initialPrice) {
  const q = quote || {};
  const lastPrice = q.last_price != null ? Number(q.last_price) : null;
  const ip =
    initialPrice != null && initialPrice !== ''
      ? Number(initialPrice)
      : null;

  return {
    last_price: lastPrice,
    pe_ttm_ratio:
      q.pe_ttm_ratio != null ? Number(q.pe_ttm_ratio) : null,
    change_rate: q.change_rate != null ? Number(q.change_rate) : null,
    high_price: q.high_price != null ? Number(q.high_price) : null,
    low_price: q.low_price != null ? Number(q.low_price) : null,
    volume: q.volume != null ? Number(q.volume) : null,
    turnover: q.turnover != null ? Number(q.turnover) : null,
    turnover_rate:
      q.turnover_rate != null ? Number(q.turnover_rate) : null,
    volume_ratio:
      q.volume_ratio != null ? Number(q.volume_ratio) : null,
    circular_market_val_yi: q.circular_market_val_yi || null,
    selfChangeRate:
      ip != null && lastPrice != null && ip > 0
        ? ((lastPrice - ip) / ip) * 100
        : null,
    kline_data: q.ma_response?.kline_data || null,
    ma_data: q.ma_response?.ma_data || null,
    price_location_indicator:
      q.ma_response?.price_location_indicator || null,
    risk_signs: q?.risk_signs || null,
  };
}
