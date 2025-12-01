import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源目录：VitePress 构建输出目录
const sourceDir = path.join(__dirname, '../docs/.vitepress/dist');
// 目标目录：主应用 dist/help 目录
const targetDir = path.join(__dirname, '../dist/help');

console.log('📚 开始复制文档站到 dist/help...');

// 检查源目录是否存在
if (!fs.existsSync(sourceDir)) {
  console.error('❌ 错误：VitePress 构建输出目录不存在');
  console.error(`   请先运行: npm run docs:build`);
  process.exit(1);
}

// 删除已存在的目标目录
if (fs.existsSync(targetDir)) {
  console.log('🗑️  清理已存在的 help 目录...');
  fs.rmSync(targetDir, { recursive: true, force: true });
}

// 确保目标目录存在
if (!fs.existsSync(path.dirname(targetDir))) {
  console.log('📁 创建 dist 目录...');
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
}

// 确保目标目录存在
if (!fs.existsSync(targetDir)) {
  console.log('📁 创建 help 目录...');
  fs.mkdirSync(targetDir, { recursive: true });
}

// 复制文件
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  console.log('📋 复制文档文件...');
  copyDir(sourceDir, targetDir);

  console.log('✅ 文档站复制完成！');
  console.log(`   源目录: ${sourceDir}`);
  console.log(`   目标目录: ${targetDir}`);
  console.log('');
  console.log('🚀 现在可以部署到服务器了：');
  console.log('   - 主应用: /');
  console.log('   - 帮助中心: /help/');

} catch (error) {
  console.error('❌ 复制失败:', error.message);
  process.exit(1);
}
