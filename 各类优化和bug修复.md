# stock-FFC-vue3前端项目

1、左侧导航菜单，点击任意一个页面菜单项，发现都会发出重复请求，譬如：
a. 点击“买点策略”，/stock-api/api/sim-trading/strategies调用两次，/stock-api/api/signal-strategies/templates?usage_scope=buy调用两次；

检查所有页面菜单项，为什么会出现那么多重复接口调用，极端影响到性能，帮我定位原因，并修复；
