/**
 * WatchList 专用的模块级缓存实例
 *
 * 不能写在 <script setup> 内部：setup 每次组件创建都会重新执行，缓存随之清空。
 * 放在独立 JS 模块里，JS 模块只执行一次（页面刷新前都存活），
 * 组件因 v-if 销毁重建也不会丢失缓存数据。
 */
import { useStockListRequestCache } from './useStockListRequestCache.js';

export const watchListCache = useStockListRequestCache();
export const WATCH_CACHE_KEY = '__watch__';
