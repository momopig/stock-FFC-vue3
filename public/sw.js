
const PATH_PREFIX = 'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/'
importScripts(PATH_PREFIX + 'workbox-sw.js')

workbox.setConfig({
  modulePathPrefix: PATH_PREFIX
});

const commonStaleWhileRevalidate = (pathname, cacheName) => {
  // 缓存活动数据，第一次读缓存，后台同时去更新缓存
  workbox.routing.registerRoute(
    ({ url }) => url.pathname === pathname,
    new workbox.strategies.StaleWhileRevalidate({
      cacheName,
    }),
    'GET'
  );
}
// commonStaleWhileRevalidate('/nest-api/activity/list', 'activity-list')
// workbox.routing.registerRoute(
//   ({ url }) => url.pathname === '/nest-api/product/search/new',
//   async (args) => {
//     const url = new URL(args.request.url);
//     console.log(url);
//     const params = new URLSearchParams(url.search);
//     console.log(params.get('hotTag'));
//     const value = params.get('hotTag') ?
//     const hotTag = params.get('hotTag') === 'true';

//     console.log('hotTag:', hotTag); // 输出 isHotTag

//     if (hotTag) {
//       // 使用 StaleWhileRevalidate 策略
//       return new StaleWhileRevalidate({
//         cacheName: 'hot-proudct-list',
//       }).handle(args);
//     } else {
//       // 直接从网络获取
//       return await fetch(args.request);
//     }
//   },
//   'GET'
// );



