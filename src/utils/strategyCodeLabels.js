// 执行策略动作码中文映射。
export const STRATEGY_ACTION_CODE_LABELS = {
  ALLOW_DISPATCH: '允许调度',
  PUBLISH_RISK_BOUNDARY: '发布风控边界',
  FORCE_CLOSE_POSITION: '强制清仓',
  PLACE_BUY_ORDER: '发起买入委托',
  PLACE_SELL_ORDER: '发起卖出委托',
  SKIP_EXECUTION: '跳过执行',
  SKIP_OPEN_ORDER: '跳过建仓委托',
  SKIP_CLOSE_ORDER: '跳过清仓委托',
  SCAN_OPEN_SIGNAL: '扫描建仓信号',
  SCAN_CLOSE_SIGNAL: '扫描清仓信号',
  SCAN_INTRADAY_T_SIGNAL: '扫描做T信号',
  EXECUTOR_EXCEPTION: '执行器异常',
};

// 执行策略结果码中文映射。
export const STRATEGY_RESULT_CODE_LABELS = {
  PASSED_RISK_GATE: '通过风控门禁',
  BLOCKED_MAX_HOLDINGS: '触发最大持股限制',
  RISK_FORCE_CLOSE_SUBMITTED: '风控清仓已提交',
  RISK_FORCE_CLOSE_NO_SELLABLE: '风控清仓失败(无可卖数量)',
  ORDER_SUBMITTED: '委托已提交',
  ORDER_FILLED: '委托已成交',
  SKIPPED_DISABLED: '已跳过(策略或绑定已停用)',
  SKIPPED_NO_EXECUTOR: '已跳过(无可用执行器)',
  SKIPPED_TIME_WINDOW: '已跳过(不在执行时段)',
  SKIPPED_BEFORE_START_DATE: '已跳过(未到开始日期)',
  SKIPPED_AFTER_END_DATE: '已跳过(超过结束日期)',
  SKIPPED_MIN_INTERVAL: '已跳过(未到最小间隔)',
  SKIPPED_MAX_SYMBOL_COUNT: '已跳过(达到持仓上限)',
  NO_OPEN_CANDIDATE: '无建仓候选',
  NO_OPEN_SIGNAL: '无建仓信号',
  NO_ELIGIBLE_OPEN_CANDIDATE: '无可下单建仓候选',
  NO_CLOSE_CANDIDATE: '无清仓候选',
  NO_SELLABLE_POSITION: '无可卖持仓',
  NO_EXIT_SIGNAL: '无清仓信号',
  NO_INTRADAY_T_CANDIDATE: '无做T候选',
  BLOCKED_ACCOUNT_RISK: '被账号风控阻断',
  BLOCKED_ACCOUNT_RISK_SLOT: '被账号风控名额阻断',
  ERROR_QUOTE_ENRICH_FAILED: '行情上下文加载失败',
  ERROR_EXECUTOR_EXCEPTION: '执行器异常失败',
};

// 统一输出“中文+英文”的展示结构，便于前端按两行渲染。
export function buildBilingualCodeLabel(code, labelMap) {
  const en = String(code || '').trim();
  if (!en) {
    return { cn: '-', en: '' };
  }
  const cn = labelMap[en] || '未定义';
  return { cn, en };
}

export function getStrategyActionLabel(code) {
  return buildBilingualCodeLabel(code, STRATEGY_ACTION_CODE_LABELS);
}

export function getStrategyResultLabel(code) {
  return buildBilingualCodeLabel(code, STRATEGY_RESULT_CODE_LABELS);
}
