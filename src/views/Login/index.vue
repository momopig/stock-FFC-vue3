<template>
    <div class="login">
        <img src="./background-image.jpg" alt="" class="background-image">
        <div class="login-container" @keydown.enter="handleLogin">
            <div class="logo-box" >
                <!-- <img src="@assets/images/login/logo.svg" alt="" /> -->
            </div>
            <h2>FFC股票智能分析系统</h2>
            <div class="version">v1.0.0</div>
            <div class="login-form">
                <div class="input-box">
                    <el-icon class="box-icon"><ElIconUser/></el-icon>
                    <input type="text" placeholder="请输入用户名" v-model="userNo" @input="onChange"/>
                </div>
                <div class="input-box">
                    <el-icon class="box-icon"><ElIconLock/></el-icon>
                    <input class="password-input" :type="showPassword ? '' : 'password'" placeholder="请输入密码" v-model="password" :class="{'has-value': password}" @input="onChange"/>
                    <el-icon class="toggle-password" @click="togglePasswordVisibility">
                        <ElIconLock v-if="!showPassword"/>
                        <ElIconUnlock v-else/>
                    </el-icon>
                </div>
                <el-button class="login-btn" @click="handleLogin" :loading="loading">
                    登录
                </el-button>
                <div class="register-btn" @click="handleRegister">
                    没有账号？点击注册
                </div>
                <!-- <div class="register-btn" @click="handleGuestLogin">
                    使用访客模式
                </div> -->
                <div v-if="errTipsShow" class="err-tips">
                    {{ errTips }}
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue';
import { login } from '../../api/modules/auth'
import { setToken } from '../../utils/auth'

export default defineComponent({
    name: 'Login',
    components: {

    },
    setup() {
        const userNo = ref('')
        const password = ref('')
        const errTipsShow = ref(false)
        const errTips = ref('')
        const showPassword = ref(false);
        const loading = ref(false)

        const handleLogin = () => {
            if (!userNo.value || !password.value) {
                errTipsShow.value = true
                errTips.value = '请输入用户名和密码'
                return
            }

            loading.value = true
            errTipsShow.value = false
            errTips.value = ''

            login({
              username: userNo.value,
              password: password.value
            }).then((res: any) => {
                // 当前格式处理：返回 {access_token, token_type}
                // 统一格式处理（注释）：如果返回 {success, payload: {data: {access_token, token_type}}, ...}
                // const token = res?.success ? res?.payload?.data?.access_token : res?.access_token || res?.accessToken
                const token = res?.access_token || res?.accessToken

                if (token) {
                    setToken(token)
                    setTimeout(() => {
                        const urlParams = new URLSearchParams(window.location.search)
                        const next = urlParams.get('next')
                        if (next) {
                            window.location.href = next
                        } else {
                            window.location.href = '/home'
                        }
                    }, 1000)
                } else {
                    errTipsShow.value = true
                    errTips.value = '登录失败，未获取到 token'
                }
            }).catch((error) => {
                errTipsShow.value = true
                // 当前格式处理：错误信息可能在 error.response?.data?.detail 或 error.response?.data?.message
                // 统一格式处理（注释）：如果返回 {success: false, message, code}，使用 error.response?.data?.message
                errTips.value = error.response?.data?.detail || error.response?.data?.message || '登录错误，请联系管理员'
            }).finally(() => {
                loading.value = false
            })
        }

        const handleRegister = () => {
            window.location.href = '/register'
        }

        const onChange = () => {
            if (userNo.value && password.value) {
                errTipsShow.value = false
                errTips.value = ''
            }
        }

        const togglePasswordVisibility = () => {
            showPassword.value = !showPassword.value;
        };

        return {
            userNo,
            password,
            errTips,
            errTipsShow,
            showPassword,
            handleLogin,
            onChange,
            togglePasswordVisibility,
            handleRegister,
            loading
        }
    }
})
</script>
<style scoped lang="less" src="./index.less"></style>
