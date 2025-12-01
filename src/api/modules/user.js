import request from '../common'
import qs from 'qs'
export const getUserInfo = async (cookie) => {
  const queryString = qs.stringify({
    cookie,
  })
  const res = await request.get(`/nest-api/user/login?` + queryString)
  return res?.result
}

export const getAgentUserInfo = async (cookie) => {
  const queryString = qs.stringify({
    cookie,
  })
  const res = await request.get(`/nest-api/user/agentLogin?` + queryString)
  return res?.result
}

export const getRequestInfo = async (cookie) => {
  const queryString = qs.stringify({
    cookie,
  })
  const res = await request.get(`/nest-api/user/request` + queryString)
  return res
}
