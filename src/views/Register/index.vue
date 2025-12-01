<template>
    <div class="register">
        <header class="header" @click="goBack">
            <el-icon><ElIconArrowLeftBold/></el-icon>
            <div class="header-title">注册账号</div>
        </header>
        <main class="main">
            <RegisterForm type="register" :callback="onSuccess"/>
        </main>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import RegisterForm from './Form.vue';
import router from '../../router';
import { ElMessage } from 'element-plus';

export default defineComponent({
    name: 'Register',
    components: {
        RegisterForm,
    },
    setup() {
        const goBack = () => {
            router.push({ path: '/login' })
        }
        const onSuccess = () => {
            ElMessage.success('注册成功，请登录')
            goBack()
        }
        return {
            goBack,
            onSuccess
        }
    }
})
</script>
<style scoped lang="less">
.register {
    .header {
        display: flex;
        align-items: center;
        width: 100%;
        background-color: #FFF;
        font-size: 20px;
        text-align: left;
        font-weight: 700;
        box-shadow: 0 8px 64px rgba(15,34,67,.1),0 0 1px rgba(15,34,67,.16);
        line-height: 56px;
        padding: 0 20px;
        cursor: pointer;
        .header-title {
            margin-left: 12px;
        }
    }
    .main {
        padding: 20px;
    }
}
</style>
