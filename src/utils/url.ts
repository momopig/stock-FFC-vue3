/**
 * @description 此文件主要是提供与url相关的方法
 */

/**
 *
 * @description   对象序列化
 * @param  {Object} obj
 * @return {String}
 */
export function stringfyQueryString(obj: any): string {
  if (!obj) return ''
  let pairs: string[] = []

  for (let key in obj) {
      let value = obj[key]

      if (value instanceof Array) {
          for (let i = 0; i < value.length; ++i) {
              pairs.push(encodeURIComponent(key + '[' + i + ']') + '=' + encodeURIComponent(value[i]))
          }
          continue
      }

      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
  }

  return pairs.join('&')
}

// export const getQueryString = (hashOrPath, name) => {
//     var reg = new RegExp('(^|&|\\?)' + name + '=([^&]*)(&|$)')
//     var r = hashOrPath.substr(1).match(reg)
//     if (r != null) return decodeURIComponent(r[2]); return null
// }

export const getQueryObj = (hash: string) => {
  let queryString = hash.split('?')[1]
  let queryObj: Record<string, string> = {}
  if (queryString) {
      let queryArr = queryString.split('&')
      queryArr.forEach(item => {
          let keyValues = item.split('=')
          queryObj[keyValues[0]] = window.decodeURIComponent(keyValues[1])
      })
  }
  return queryObj
}

export const replaceUrl = (replaceQuery = {}) => {
  if (typeof replaceQuery !== 'object' || !replaceQuery) {
      return
  }
  let queryObj = getQueryObj(window.location.href)
  let newUrl = makeUrlString('', {
      ...queryObj,
      ...replaceQuery
  })
  window.history.replaceState({}, '', newUrl)
}

export const makeUrlString = (pathStr: string, paramObj: any) => {
  let str = ''
  if (!pathStr) {
      pathStr = window.location.hash.split('?')[0] || '/'
  }
  if (typeof paramObj !== 'object') {
      return pathStr
  }
  for (let key in paramObj) {
      str += key + '=' + encodeURIComponent(paramObj[key]) + '&'
  }
  let result = pathStr + '?' + str.replace(/&$/, '')
  return result
}

export const decodeObjParams = (name: string) => {
  let queryObj = getQueryObj(window.location.href)
  let params = queryObj[name]
  let paramsJson
  if (params) {
      try {
          paramsJson = JSON.parse(decodeURIComponent(params))
      } catch {
          paramsJson = null
      }
  }
  return paramsJson
}

export const extractPathFromUrl = (url: string) => {
  const regex = /https?:\/\/[^\/]+(\/.*)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}
