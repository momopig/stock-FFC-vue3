<template>
  <div class="login">
    <img src="./background-image.jpg" alt="" class="background-image" />
    <div class="login-container" @keydown.enter="handleLogin">
      <div class="logo-box">
        <!-- <img src="@assets/images/login/logo.svg" alt="" /> -->
      </div>
      <h2>FFC股票智能分析系统</h2>
      <div class="version">v1.0.0</div>
      <div class="login-form">
        <div class="input-box">
          <el-icon class="box-icon"><ElIconUser /></el-icon>
          <input
            type="text"
            placeholder="请输入用户名"
            v-model="userNo"
            @input="onChange"
          />
        </div>
        <div class="input-box">
          <el-icon class="box-icon"><ElIconLock /></el-icon>
          <input
            class="password-input"
            :type="showPassword ? '' : 'password'"
            placeholder="请输入密码"
            v-model="password"
            :class="{ 'has-value': password }"
            @input="onChange"
          />
          <el-icon class="toggle-password" @click="togglePasswordVisibility">
            <ElIconLock v-if="!showPassword" />
            <ElIconUnlock v-else />
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
import { login } from '../../api/modules/auth';
import { getCurrentUserInfo } from '../../api/modules/customerUser';
import { removeToken, setToken } from '../../utils/auth';
import { UserStore } from '../../state/user';

export default defineComponent({
  name: 'Login',
  components: {},
  setup() {
    const userStore = UserStore();
    const userNo = ref('');
    const password = ref('');
    const errTipsShow = ref(false);
    const errTips = ref('');
    const showPassword = ref(false);
    const loading = ref(false);

    const clearStaleLoginState = () => {
      userStore.clearUserData();
      removeToken();
      localStorage.clear();
      sessionStorage.clear();
    };

    const handleLogin = async () => {
      if (!userNo.value || !password.value) {
        errTipsShow.value = true;
        errTips.value = '请输入用户名和密码';
        return;
      }

      loading.value = true;
      errTipsShow.value = false;
      errTips.value = '';
      clearStaleLoginState();

      try {
        const res: any = await login({
          username: userNo.value,
          password: password.value,
        });

        const accessToken = res?.payload?.access_token;
        if (!res?.success || !accessToken) {
          errTipsShow.value = true;
          errTips.value = '登录失败，未获取到 token';
          clearStaleLoginState();
          return;
        }

        setToken(accessToken);

        const userInfoRes: any = await getCurrentUserInfo();
        if (!userInfoRes?.success || !userInfoRes?.payload?.id) {
          errTipsShow.value = true;
          errTips.value = '登录失败，未能获取当前用户信息';
          clearStaleLoginState();
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const next = urlParams.get('next');
        window.location.href = next || '/home';
      } catch (error: any) {
        errTipsShow.value = true;
        clearStaleLoginState();
        errTips.value =
          error?.message ||
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          '登录错误，请联系管理员';
      } finally {
        loading.value = false;
      }
    };

    const handleRegister = () => {
      window.location.href = '/register';
    };

    const onChange = () => {
      if (userNo.value && password.value) {
        errTipsShow.value = false;
        errTips.value = '';
      }
    };

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
      loading,
    };
  },
});
</script>
<style scoped lang="less" src="./index.less"></style>
