import { ElNotification } from 'element-plus';

/**
 * 创建带有可点击样式的通知
 * @param {Object} options - 通知配置选项
 * @param {string} options.title - 通知标题
 * @param {string} options.message - 通知消息
 * @param {string} options.clickableText - 可点击的文本（默认为"点击查看详情"）
 * @param {number} options.duration - 显示时长（毫秒）
 * @param {Function} options.onClick - 点击回调函数
 * @param {string} options.type - 通知类型
 * @returns {Object} ElNotification 实例
 */
export const createClickableNotification = (options = {}) => {
  const {
    title = '',
    message = '',
    clickableText = '点击查看详情',
    duration = 6000,
    onClick,
    type = 'info'
  } = options;

  // 将可点击文本包装在带有样式的 span 中
  const styledMessage = message.replace(
    clickableText,
    `<span style="color: #409eff; text-decoration: underline; cursor: pointer;">${clickableText}</span>`
  );

  return ElNotification({
    title,
    message: styledMessage,
    duration,
    dangerouslyUseHTMLString: true, // 允许使用 HTML 字符串
    type,
    onClick: () => {
      if (onClick) {
        onClick();
      }
    }
  });
};

