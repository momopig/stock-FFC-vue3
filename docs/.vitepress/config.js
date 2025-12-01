export default {
  title: '云智猫-ERP帮助中心',
  description: '功能使用说明文档',
  base: '/help/',  // 部署在 /help/ 路径下

  // 主题配置
  themeConfig: {
    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: '使用指南', link: '/guide/getting-started' },
      { text: '返回系统', link: '/' }
    ],

    // 侧边栏
    sidebar: {
      '/guide/': [
        { text: '快速开始', link: '/guide/getting-started' },
      ],
      '/features/': [
        {
          text: '质检不合格查询',
          items: [
            { text: '质检不合格查询', link: '/features/quality/list' }
          ]
        },
        {
          text: 'SKC详情',
          items: [
            { text: 'SKC详情', link: '/features/skc/search' }
          ]
        },
        {
          text: '发补货管理',
          items: [
            { text: 'today今日可发货', link: '/features/delivery/today' },
            { text: 'auto自动发货配置', link: '/features/delivery/auto' },
          ]
        },
        {
          text: '监控管理',
          items: [
            { text: '监控列表', link: '/features/monitor/list' }
          ]
        },
        {
          text: '工具箱',
          items: [
            { text: '数据对比工具', link: '/features/tools/compare' },
            { text: '利润计算工具', link: '/features/tools/profit' },
            { text: 'EU-DOC生成工具', link: '/features/tools/eu-doc' },
            { text: '汇率转换工具', link: '/features/tools/exchange-rate' },
            { text: '多国说明书生成工具', link: '/features/tools/multi-language-manual' },
          ]
        },
        {
          text: '供应商管理',
          items: [
            { text: '供应商列表', link: '/features/supplier/list' },
            // { text: '供应商地址管理', link: '/features/supplier/address' },
          ]
        },
        {
          text: '店铺管理',
          items: [
            { text: '店铺列表', link: '/features/shop/list' },
          ]
        },
        {
          text: '用户管理',
          items: [
            { text: '用户列表', link: '/features/user/list' },
          ]
        }
        // {
        //   text: '活动管理',
        //   items: [
        //     { text: '活动列表', link: '/features/activity/list' },
        //     { text: '活动编辑', link: '/features/activity/edit' }
        //   ]
        // },
        // {
        //   text: '订单管理',
        //   items: [
        //     { text: '发货管理', link: '/features/order/deliver' },
        //     { text: '备货单查询', link: '/features/order/stock' }
        //   ]
        // },
        // {
        //   text: '商品管理',
        //   items: [
        //     { text: '商品复制', link: '/features/product/copy' }
        //   ]
        // },
      ]
    },

    // 搜索配置
    search: {
      provider: 'local'  // 本地搜索
    },

    // 社交链接
    // socialLinks: [
    //   { icon: 'github', link: 'https://github.com/vuejs/vitepress' }
    // ],

    // 页脚
    footer: {
      message: '云智猫-ERP帮助中心',
      // copyright: 'Copyright © 2024'
    },

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/hhxc-icodeajk/shop-frontend-vue3/tree/master/docs/:path',
      text: '在 GitHub 上编辑此页'
    },

    // 最后更新时间
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },

  // Markdown 配置
  markdown: {
    lineNumbers: true,
    // 自定义容器
    container: {
      tipLabel: '提示',
      warningLabel: '警告',
      dangerLabel: '危险',
      infoLabel: '信息',
      detailsLabel: '详情'
    }
  }
}
