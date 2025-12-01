import { ElMessage } from 'element-plus';

export function copyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
  ElMessage({
    message: '已复制到剪贴板',
    type: 'success',
  });
}
