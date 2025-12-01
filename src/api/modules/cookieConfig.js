import request from '../common'
import { UserStore } from '@/state/user';


/**
 * 获取Cookie配置状态
 */
export const getCookieStatus = (ownerId) => {
  return request({
    url: '/nest-api/cookie-config/status',
    method: 'get',
    params: ownerId ? { ownerId } : {}
  })
}

/**
 * 保存Cookie配置
 */
export const saveCookieConfig = (data) => {
  const userStore = UserStore();
  data.ownerId = userStore.userInfo.ownerId || userStore.userInfo.parentId || userStore.userInfo.id;
  return request({
    url: '/nest-api/cookie-config/save',
    method: 'post',
    data
  })
}

/**
 * 获取Cookie配置详情（管理员）
 */
export const getCookieConfig = (ownerId) => {
  return request({
    url: '/nest-api/cookie-config/config',
    method: 'get',
    params: ownerId ? { ownerId } : {}
  })
}

/**
 * 更新Cookie状态
 */
export const updateCookieStatus = (data) => {
  return request({
    url: '/nest-api/cookie-config/update-status',
    method: 'put',
    data
  })
}

/**
 * 验证Cookie有效性
 */
export const validateCookie = (data) => {
  return request({
    url: '/nest-api/cookie-config/validate',
    method: 'post',
    data
  })
}

/**
 * 删除Cookie配置
 */
export const deleteCookieConfig = (ownerId) => {
  return request({
    url: '/nest-api/cookie-config/delete',
    method: 'delete',
    params: ownerId ? { ownerId } : {}
  })
}
