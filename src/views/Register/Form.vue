<template>
  <div class="list-container">
      <el-form
          ref="formRef"
          label-position="left"
          label-width="auto"
          size="large"
          class="step-one-form"
          :model="form"
          :rules="rules"
      >
          <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号"></el-input>
          </el-form-item>
          <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" :placeholder="isRegister ? '请输入密码' : '请输入密码, 编辑时为空表示不更新'" type="password"></el-input>
          </el-form-item>
          <el-form-item label="确认密码" prop="passwordConfirmation">
              <el-input v-model="form.passwordConfirmation" :placeholder="isRegister ? '请输入确认密码' : '请输入确认密码, 编辑时为空表示不更新'" type="password"></el-input>
          </el-form-item>
          <el-form-item label="昵称" prop="username">
              <el-input v-model="form.username" placeholder="请输入昵称"></el-input>
          </el-form-item>
          <!-- 角色选择暂时移除，所有用户权限一致 -->
          <el-form-item label="所属组织/公司" prop="company">
              <el-input v-model="form.company" :readonly="isInviteRegister" placeholder="请输入所属组织/公司"></el-input>
          </el-form-item>
          <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder=""></el-input>
          </el-form-item>
          <el-button class="submit" type="primary" @click="submitForm">提交</el-button>
      </el-form>
  </div>
</template>
<script lang="ts">
import { ref, defineComponent, onMounted } from 'vue';
import router from '../../router';
import { getUserDetail, updateUser, addUser } from '../../api/modules/customerUser';
import { getQueryObj } from '../../utils/url';
import { ElMessage } from 'element-plus';

// 角色选择已移除

export default defineComponent({
  name: 'CreateUser',
  props: {
      type: {
          type: String,
          default: ''
      },
      callback: {
          type: Function,
          default: null
      }
  },
  setup(props) {
      const form = ref<{
          username: string,
          password?: string,
          passwordConfirmation?: string,
          phone: string,
          type?: string,
          company: string,
          remark: string,
          masterId?: string,
          roleId?: string
      }>({
          username: '',
          password: '',
          passwordConfirmation: '',
          phone: '',
          // 角色已弃用
          company: '',
          remark: '',
          masterId: '',
          roleId: ''
      })
      const pageType = ref<string>('create')
      const tableData = ref([])
      const formRef = ref();
      const isInviteRegister = ref(false);

      const validatePassword = (_rule: any, value: string, callback: any) => {
          if (value !== form.value.password) {
              callback(new Error('两次输入密码不一致'));
          } else {
              callback();
          }
      }

      const rules = ref({
          phone: [
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' },
              { required: true, message: '请输入手机号', trigger: 'blur' }
          ],
          password: [
              { required: true, message: '请输入密码', trigger: 'blur' }
          ],
          passwordConfirmation: [
              { required: true, message: '请输入确认密码', trigger: 'blur' },
              { validator: validatePassword, trigger: 'blur' }
          ],
          username: [
              { required: true, message: '请输入昵称', trigger: 'blur' }
          ],
          // 角色校验移除
          company: [
              { required: true, message: '请输入所属公司', trigger: 'blur' }
          ],
      });

      onMounted(() => {
          const { type, id, masterId, roleId } = getQueryObj(window.location.search);
          pageType.value = type;

          // 检查是否为邀请注册
          if (masterId && roleId) {
              // 邀请注册，预填充主账号ID和角色ID
              form.value.masterId = masterId;
              form.value.roleId = roleId;
          }

          // 若链接携带company参数，则预填并设为邀请注册（字段只读）
          const { company } = getQueryObj(window.location.search);
          if (company) {
              form.value.company = decodeURIComponent(company);
              isInviteRegister.value = true;
          }

          if (type === 'edit' && id) {
              getUserDetailFn(Number(id))
          }
      })

      const getUserDetailFn = (id: number) => {
          getUserDetail(id).then((res: any) => {
              if (res.success === true) {
                  form.value = { ...res.result, password: '*****', passwordConfirmation: '*****' }
              } else {
                  ElMessage.error('获取用户信息失败');
              }
          })
      }

      const submitForm = () => {
          formRef.value.validate((valid: boolean) => {
              if (valid) {
                  const { type, id } = getQueryObj(window.location.search);
                  if (type === 'edit') {
                      if (form.value.password === '*****') {
                          delete form.value.password;
                      }
                      delete form.value.passwordConfirmation;
                      const payload = { ...form.value, id: Number(id) } as any;
                      updateUser(Number(id), payload).then((res: any) => {
                          if (res.success === true) {
                              router.push({
                                  name: 'home'
                              })
                          }
                      })
                  } else {
                      addUser(form.value).then((res: any) => {
                          if (res.success === true) {
                              if (props.callback) {
                                  props.callback();
                              } else {
                                  router.push({
                                      name: 'home'
                                  })
                              }
                          }
                      })
                  }
              } else {
                  ElMessage.error('请填写完整表单');
                  return false;
              }
          });
      }

      return {
          form,
          rules,
          formRef,
          isRegister: props.type === 'register' ? true : false,
          isInviteRegister,
          submitForm,
          tableData,
          pageType,
      }
  }
})
</script>
<style lang="less" scoped>
.list-container {
  height: calc(100vh - 100px);
  background: #fff;
  box-shadow: 0 8px 64px rgba(15, 34, 67, 0.1), 0 0 1px rgba(15, 34, 67, 0.16);
  border-radius: 10px;
  padding: 20px;
  &.full-height {
      height: 100vh;
  }
  .new-btn {
      margin-bottom: 20px;
      float: right;
  }
  .submit {
      float: right;
  }
}
</style>
