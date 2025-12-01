/**
 * @description 此文件是关于用户登陆校验等的方法
 */
import Cookies from 'js-cookie';
import { getLocal, setLocal } from './storage';
// 根据项目的设置进行更改cookie中保存的tokenkey
const TokenKey = 'token';

/** @description 获取token */
export function getToken(): string | undefined {
    return Cookies.get(TokenKey);
}

/** @description 设置token */
export function setToken(token: string): string | undefined {
    return Cookies.set(TokenKey, token);
}

/** @description 移除token的方式,一般是在登出的时候 */
export function removeToken(): void {
    return Cookies.remove(TokenKey);
}
