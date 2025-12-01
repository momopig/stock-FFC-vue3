import request from '../common'
import qs from 'qs'

export const autoLoginByAgent = async (agentCookie) => {
  const queryString = qs.stringify({ agentCookie })
  const res = await request.get(`/nest-api/auth/auto-login-by-agent?` + queryString)
  return res
}

export const autoLoginByCookie = async (cookie) => {
  const queryString = qs.stringify({ cookie })
  const res = await request.get(`/nest-api/auth/auto-login-by-cookie?` + queryString)
  return res
}
