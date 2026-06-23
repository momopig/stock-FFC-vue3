import request from '../common'

export const getRoleDefinitions = async () => {
  return await request.get('/stock-api/api/roles/definitions')
}

export const getRoleList = async () => {
  return await request.get('/stock-api/api/roles/')
}

export const createRole = async (body) => {
  return await request.post('/stock-api/api/roles/', body)
}

export const updateRole = async (roleId, body) => {
  return await request.patch(`/stock-api/api/roles/${roleId}`, body)
}

export const deleteRole = async (roleId) => {
  return await request.delete(`/stock-api/api/roles/${roleId}`)
}

export const assignUserRoles = async (userId, roleKeys) => {
  return await request.put(`/stock-api/api/roles/users/${userId}`, { role_keys: roleKeys })
}
