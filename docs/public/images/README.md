# 图片资源目录

此目录用于存放帮助文档中的图片资源。

## 目录结构

```
images/
├── activity/           # 活动管理相关图片
│   ├── activity-list.png
│   └── activity-edit.png
├── order/              # 订单管理相关图片
│   ├── order-deliver.png
│   └── order-stock.png
└── product/            # 商品管理相关图片
    └── product-copy.png
```

## 图片命名规范

- 使用小写字母和连字符
- 文件名要能清楚表达图片内容
- 建议使用 PNG 格式保证图片质量

## 使用说明

在 Markdown 文档中引用图片：

```markdown
![图片描述](/images/category/image-name.png)
```

注意：图片路径以 `/images/` 开头，VitePress 会自动处理为正确的路径。
