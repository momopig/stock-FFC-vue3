import request from '../common'
import qs from 'qs'
import { UserStore } from '@/state/user';
// 注意：不要在模块顶层实例化 Pinia 的 store，否则会在 app.use(pinia) 之前运行导致报错
// 通过懒获取的方式在调用处再拿 store，确保 Pinia 已经激活
const getUserStore = () => UserStore();
export const customerLogin = async (body) => {
  const res = await request.post(`/nest-api/auth/login`, body)
  return res
}

export const guestLogin = async (body) => {
  const res = await request.post(`/nest-api/auth/guestLogin`, body)
  return res
}

export const getAll = async (body) => {
  const queryString = qs.stringify({
    pageNo: body.pageNo,
    pageSize: body.pageSize,
  })
  const res = await request.get(`/nest-api/customerUser/all?` + queryString)
  return res
  // {
  //   "success": true,
  //   "result": {
  //     "data": [
  //       {
  //         "id": 1,
  //         "username": "icodeajk",
  //         "password": "$2b$10$AJMRyV/0Q6u5DjqN1TN1fuqr6xtMp80TWPZ/xWPRkuP500EfPrx4a",
  //         "phone": "13613643692",
  //         "company": "",
  //         "remark": "",
  //         "createdAt": "2025-09-09T02:58:03.014Z"
  //       }
  //     ],
  //     "count": 1
  //   }
  // }
}

export const getUserDetail = async (id) => {
  const res = await request.get(`/nest-api/customerUser/detail/${id}`)
  return res
  // {
  //   "success": true,
  //   "result": {
  //     "id": 1,
  //     "username": "icodeajk",
  //     "phone": "13613643692",
  //     "company": "",
  //     "remark": "",
  //     "createdAt": "2025-09-09T02:58:03.014Z"
  //   }
  // }
}

export const updateUser = async (body) => {
  const res = await request.post(`/nest-api/customerUser/update/${body.id}`, body)
  return res
}

export const addUser = async (body) => {
  const res = await request.post(`/nest-api/auth/register`, body)
  return res
}

export const deleteUser = async (id) => {
  const res = await request.get(`/nest-api/customerUser/delete/${id}`)
  return res
}

export const getCurrentUserInfo = async () => {
  // const res = await request.get(`/nest-api/auth/me`)
  const res = {
    "success": true,
    "result": {
        "id": 5,
        "username": "icodeajk",
        "phone": "13613643692",
        "company": "华海星辰",
        "remark": "",
        "parentId": 10,
        "roleId": "8dd0fd83-fbb1-4cf0-ad30-594a7f8ecb32",
        "isActive": true,
        "createdBy": 10,
        "createdAt": "2025-09-15T12:16:40.211Z",
        "updatedAt": "2025-10-31T06:25:15.100Z",
        "accountId": "22150585441904",
        "role": {
            "id": "8dd0fd83-fbb1-4cf0-ad30-594a7f8ecb32",
            "name": "master",
            "displayName": "超级管理员",
            "description": "系统内置：拥有所有权限，可以管理子账号和角色",
            "permissions": [
                "qc:view",
                "skc:view",
                "today:deliver:view",
                "auto:deliver:view",
                "monitor:view",
                "tool:view",
                "diff:tool:view",
                "exchange:rate:tool:view",
                "eudoc:tool:view",
                "profit:calculator:tool:view",
                "tool:multiLanguageManual:view",
                "supplier:view",
                "supplier:create",
                "supplier:edit",
                "supplier:delete",
                "supplier:address:view",
                "mall:view",
                "mall:create",
                "mall:edit",
                "mall:delete",
                "user:view",
                "user:create",
                "user:edit",
                "user:delete"
            ],
            "createdBy": null,
            "isActive": true,
            "createdAt": "2025-09-15T12:16:40.221Z",
            "updatedAt": "2025-11-13T03:43:42.000Z"
        },
        "companyList": [
            {
                "companyName": "_",
                "malInfoList": [
                    {
                        "mallId": 634418214805739,
                        "mallName": "Temptation Junction"
                    },
                    {
                        "mallId": 5499965745084,
                        "mallName": "Bequemlichkeit"
                    },
                    {
                        "mallId": 6291236022422,
                        "mallName": "Cozy Corner LLC"
                    },
                    {
                        "mallId": 634418214328094,
                        "mallName": "Lady Luxe Glamour"
                    },
                    {
                        "mallId": 634418218181407,
                        "mallName": "Pet Pal Hut"
                    },
                    {
                        "mallId": 634418215728995,
                        "mallName": "Dwelling Care Elf"
                    },
                    {
                        "mallId": 634418218648096,
                        "mallName": "Pet Attire Co"
                    },
                    {
                        "mallId": 634418218181680,
                        "mallName": "Home Living Pavilion"
                    },
                    {
                        "mallId": 634418218181487,
                        "mallName": "Goddess Picks"
                    },
                    {
                        "mallId": 634418214811074,
                        "mallName": "Value Vault LLC"
                    }
                ]
            }
        ],
        "nickName": "icodeajk",
        "maskOwnerMobile": "3692",
        "subject": "华海星辰",
        "isMaster": true,
        "ownerId": 10,
        "permissionCodes": [
            "qc:view",
            "skc:view",
            "today:deliver:view",
            "auto:deliver:view",
            "monitor:view",
            "tool:view",
            "diff:tool:view",
            "exchange:rate:tool:view",
            "eudoc:tool:view",
            "profit:calculator:tool:view",
            "tool:multiLanguageManual:view",
            "supplier:view",
            "supplier:create",
            "supplier:edit",
            "supplier:delete",
            "supplier:address:view",
            "mall:view",
            "mall:create",
            "mall:edit",
            "mall:delete",
            "user:view",
            "user:create",
            "user:edit",
            "user:delete",
            "adv:basic",
            "adv:hhxcPermission",
            "adv:erpApiTest",
            "adv:dashboard",
            "adv:priceManagement",
            "adv:activityManagement",
            "adv:copyTools",
            "adv:certManagement",
            "adv:tagManagement",
            "adv:tokenGeneration",
            "adv:sensitive"
        ],
        "hasCookieAccess": true,
        "hasAgentCookieAccess": true
    }
  }
  if (res?.success) {
    const userStore = getUserStore();
    // 设置用户基础信息
    userStore.setUserInfo(res?.result)
    const mallList = res?.result?.companyList?.[0]?.malInfoList;
    userStore.setMallList(mallList || []);
    userStore.setRole(res?.result?.role?.displayName || res?.result?.role?.name)
    userStore.setIsMainAccount(!res.result?.parentId)
    // 使用合成后的权限码（包含基础权限 + 高级权限）
    userStore.setPermissions(res?.result?.permissionCodes || res?.result?.role?.permissions || [])
    // 设置Cookie访问状态
    userStore.setHasCookieAccess(res?.result?.hasCookieAccess || false)
    userStore.setHasAgentCookieAccess(res?.result?.hasAgentCookieAccess || false)
    userStore.setOwnerId(res?.result?.ownerId)
  }
  return res
}

// 新增权限相关API

// 获取主账号下的用户列表
export const getUsersByMaster = async (params) => {
  const queryString = qs.stringify(params)
  const res = await request.get(`/nest-api/customerUser/master/users?` + queryString)
  return res
}

// 创建子账号
export const createSubUser = async (body) => {
  const res = await request.post(`/nest-api/customerUser/subUser`, body)
  return res
}

// 获取主账号的角色列表
export const getRolesByMaster = async () => {
  const res = await request.get(`/nest-api/customerUser/roles`)
  return res
}

// 创建角色
export const createRole = async (body) => {
  const res = await request.post(`/nest-api/customerUser/roles`, body)
  return res
}

// 更新角色
export const updateRole = async (body) => {
  const res = await request.put(`/nest-api/customerUser/roles/${body.id}`, body)
  return res
}

// 删除角色
export const deleteRole = async (id) => {
  const res = await request.delete(`/nest-api/customerUser/roles/${id}`)
  return res
}

// 获取权限常量定义
export const getPermissionConstants = async () => {
  const res = await request.get(`/nest-api/customerUser/permissions/constants`)
  return res
}

// 获取用户权限信息
export const getUserPermissions = async () => {
  const res = await request.get(`/nest-api/auth/permissions`)
  return res
}

// 获取当前用户的主账号ID
export const getMasterId = async () => {
  const res = await request.get(`/nest-api/customerUser/master-id`)
  return res
}
