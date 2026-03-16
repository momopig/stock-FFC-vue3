import moment from 'moment';
export function isTimeZeroZeroZero(timestamp) {
  const date = new Date(timestamp);
  return (
    date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0
  );
}
export function isAfter5PM() {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= 17; // 17 表示下午5点
}
export function isToday(date) {
  return moment(date).isSame(moment(), 'day');
}

export function isYesterday(date) {
  return moment(date).isSame(moment().subtract(1, 'day'), 'day');
}

export function calculateRemainingTime(inputTime) {
  // 解析输入时间
  const startTime = moment(inputTime);

  // 计算24小时后的时间
  const endTime = startTime.clone().add(24, 'hours');

  // 获取当前时间
  const now = moment();

  // 计算剩余时间
  const duration = moment.duration(endTime.diff(now));

  // 如果已经超过24小时，返回时间为0
  if (duration.asMilliseconds() <= 0) {
    return '已超时';
  }

  // 获取剩余的小时、分钟和秒
  const hours = Math.floor(duration.asHours());
  const minutes = duration.minutes();
  const seconds = duration.seconds();

  return `剩余 ${hours} 时 ${minutes} 分 ${seconds} 秒`;
}

/**
 * 计算加入天数：以 snapshot_date 为基准日（YYYY-MM-DD），未提供则以今天为基准。
 * @param {string|Date} addTime - 加入时间（ISO 字符串或 Date）
 * @param {string} snapshotDate - 快照日期（YYYY-MM-DD）
 * @returns {number|null} 天数（整数），无法计算时返回 null
 */
export const calculateDaysAdded = (addTime, snapshotDate = '') => {
  if (!addTime) return null;

  // “加入天数”按自然日计算：忽略时分秒，避免因 00:00/当前时间导致差 1 天
  const base =
    snapshotDate && moment(snapshotDate, 'YYYY-MM-DD', true).isValid()
      ? moment(snapshotDate, 'YYYY-MM-DD').startOf('day')
      : moment().startOf('day');

  const joined = moment(addTime).startOf('day');
  if (!joined.isValid()) return null;

  return base.diff(joined, 'days');
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (dateTime) => {
  return dateTime ? new Date(dateTime).toLocaleString() : '--';
};
