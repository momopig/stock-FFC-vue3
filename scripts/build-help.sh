#!/bin/bash

echo "🚀 开始构建帮助中心文档系统..."

# 检查 VitePress 是否已安装
if ! command -v vitepress &> /dev/null; then
    echo "❌ VitePress 未安装，请先运行: npm install"
    exit 1
fi

# 检查 docs 目录是否存在
if [ ! -d "docs" ]; then
    echo "❌ docs 目录不存在"
    exit 1
fi

# 检查 VitePress 配置文件
if [ ! -f "docs/.vitepress/config.js" ]; then
    echo "❌ VitePress 配置文件不存在"
    exit 1
fi

echo "✅ 环境检查通过"

# 构建文档站
echo "📚 构建 VitePress 文档站..."
vitepress build docs

if [ $? -eq 0 ]; then
    echo "✅ VitePress 构建成功"

    # 运行复制脚本
    echo "📋 复制文档到 dist/help..."
    node scripts/copy-docs.js

    if [ $? -eq 0 ]; then
        echo "🎉 帮助中心构建完成！"
        echo ""
        echo "📁 构建产物位置："
        echo "   - 主应用: dist/"
        echo "   - 帮助中心: dist/help/"
        echo ""
        echo "🌐 访问地址："
        echo "   - 主应用: http://localhost:5173"
        echo "   - 帮助中心: http://localhost:5173/help/"
    else
        echo "❌ 复制文档失败"
        exit 1
    fi
else
    echo "❌ VitePress 构建失败"
    exit 1
fi
