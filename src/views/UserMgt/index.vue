<template>
  <div class="user-mgt-container">
    <div class="search-title">
      <el-input
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索用户名或邮箱"
        clearable
        @keyup.enter="searchHandler"
      />
      <el-button class="search-btn" type="primary" @click="searchHandler">搜索</el-button>
      <el-button class="search-btn" type="primary" @click="reset">重置</el-button>
      <el-button
        class="new-user"
        type="primary"
        @click="addUserFn"
        v-permission="permissions.USER_CREATE"
      >
        新建用户
      </el-button>
      <!-- <el-button class="export-btn" type="success" @click="exportUsers" :icon="Download">导出</el-button> -->
    </div>

    <el-table
      class="user-table"
      max-height="calc(100% - 100px)"
      :data="userList"
      v-loading="tableLoading"
      element-loading-text="加载用户数据中..."
      @filter-change="handleFilterChange"
      @sort-change="handleSortChange"
    >
      <el-table-column v-for="item in columns"
        :column-key="item.key"
        :prop="item.prop"
        :label="item.label"
        :filters="item.filters"
        :filterable="!!item.filters"
        :sortable="!!item.sortable"
        :width="item.width"
      >
        <template #default="{ row, $index }">
          <span v-if="item.key === 'index'" :key="$index">
            {{ $index + 1 }}
          </span>
          <span v-else-if="item.key === 'createdAt'">
            {{ row[item.prop] ? formatDateTime(row[item.prop]) : '--' }}
          </span>
          <span v-else-if="item.key === 'updatedAt'">
            {{ row[item.prop] ? formatDateTime(row[item.prop]) : '--' }}
          </span>
          <span v-else-if="item.key === 'isActive'">
            <el-tag :type="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? '启用' : '禁用' }}
            </el-tag>
          </span>
          <span v-else-if="item.key === 'isSuperuser'">
            <el-tag :type="row.is_superuser ? 'warning' : 'info'">
              {{ row.is_superuser ? '超级管理员' : '普通用户' }}
            </el-tag>
          </span>
          <span v-else class="ellipsis" :title="row[item.prop] || '--'">
            {{ row[item.prop] || '--' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column fixed="right" label="操作" width="250">
        <template v-slot="scope">
          <el-button
            link
            type="primary"
            @click="operateHandler('view', scope.row.id)"
            v-permission="permissions.USER_VIEW"
          >
            查看
          </el-button>
          <el-button
            link
            type="primary"
            @click="operateHandler('edit', scope.row.id)"
            v-permission="permissions.USER_EDIT"
          >
            编辑
          </el-button>
          <el-popconfirm
            v-permission="permissions.USER_DELETE"
            title="确定要删除该用户吗？"
            confirm-button-text="确定"
            cancel-button-text="取消"
            @confirm="operateHandler('delete', scope.row.id)"
          >
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pagination"
      v-model:current-page="page.pageNo"
      :page-size="page.pageSize"
      :total="page.total"
      layout="total, prev, pager, next"
      @current-change="handlePageChange"
    />

    <!-- 用户管理弹窗 -->
    <UserDialog
      v-model:visible="dialogVisible"
      :form-data="userForm"
      :is-view-mode="isViewMode"
      :is-edit-mode="isEditMode"
      @submit="submitUser"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getUserList as getUserListApi,
  createUser,
  updateUser,
  getUserDetail,
  deleteUser
} from '@/api/modules/customerUser'
import UserDialog from './components/UserDialog.vue'
import { formatDateTime } from '@/utils/time'
// import { jsonToExcel } from '@/utils/excel'
import { usePermissions } from '@/composables/usePermissions'

// 权限相关
const { permissions, isMainAccount } = usePermissions()

// 响应式数据
const searchQuery = ref('')
const userList = ref([])
const tableLoading = ref(false)
const dialogVisible = ref(false)
const isViewMode = ref(false)
const isEditMode = ref(false)

// 分页参数
const page = reactive({
  pageNo: 1,
  pageSize: 10,
  total: 0,
  // 新接口使用 page 和 page_size
  page: 1,
  page_size: 10
})

// 过滤参数
const filterParams = reactive({})

// 表格列配置
const columns = reactive([
  {
    key: 'index',
    label: '序号',
    width: 80,
  },
  {
    key: 'username',
    label: '用户名',
    prop: 'username',
  },
  {
    key: 'email',
    label: '邮箱',
    prop: 'email',
  },
  {
    key: 'full_name',
    label: '全名',
    prop: 'full_name',
  },
  {
    key: 'isActive',
    label: '状态',
    prop: 'is_active',
  },
  {
    key: 'isSuperuser',
    label: '类型',
    prop: 'is_superuser',
  },
  {
    key: 'createdAt',
    label: '创建时间',
    prop: 'created_at',
    sortable: true,
  }
])

// 初始化用户表单
const initUserForm = () => {
  return {
    id: null,
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_active: true,
    is_superuser: false
  }
}

const userForm = ref(initUserForm())

// 页面加载时获取用户列表
onMounted(() => {
  searchHandler()
})

// 获取用户列表
const getUserList = async () => {
  try {
    tableLoading.value = true
    // 更新分页参数
    page.page = page.pageNo
    page.page_size = page.pageSize

    const response = await getUserListApi({
      page: page.page,
      page_size: page.page_size
    })

    // 当前格式处理：返回 {total, page, page_size, items: [...]}
    // 统一格式处理（注释）：如果返回 {success, payload: {data: [...], total}, ...}
    // const items = response?.success ? response?.payload?.data : response?.items || response?.data
    // const total = response?.success ? response?.payload?.total : response?.total
    const items = response?.items || response?.data || []
    const total = response?.total || 0

    if (items.length >= 0) {
      userList.value = items
      page.total = total
    } else {
      ElMessage.error('获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败，请稍后重试')
  } finally {
    tableLoading.value = false
  }
}

// 过滤处理
const handleFilterChange = (filters) => {
  // 可以在这里添加过滤逻辑
  searchHandler()
}

// 排序处理
const handleSortChange = (sort) => {
  if (sort.prop) {
    page.sortOrders = {
      [sort.prop]: sort.order === 'ascending' ? 'ASC' : 'DESC'
    }
    searchHandler()
  }
}

// 分页处理
const handlePageChange = (newPage) => {
  page.pageNo = newPage
  getUserList()
}

// 搜索处理
const searchHandler = () => {
  page.pageNo = 1
  getUserList()
}

// 重置搜索
const reset = () => {
  searchQuery.value = ''
  searchHandler()
}

// 操作处理
const operateHandler = async (type, id) => {
  switch(type) {
    case 'edit':
    case 'view':
      try {
        const res = await getUserDetail(id)
        // 当前格式处理：直接返回用户对象
        // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
        // const data = res?.success ? res?.payload?.data : res?.result || res?.data
        const data = res?.result || res?.data || {}
        userForm.value = { ...data }
        isViewMode.value = type === 'view'
        isEditMode.value = type === 'edit'
        dialogVisible.value = true
      } catch (error) {
        console.error('获取用户详情失败:', error)
        ElMessage.error('获取用户详情失败')
      }
      break
    case 'delete':
      try {
        await deleteUser(id)
        ElMessage.success('删除用户成功')
        searchHandler()
      } catch (error) {
        console.error('删除用户失败:', error)
        ElMessage.error('删除用户失败：' + (error.response?.data?.message || error.message))
      }
      break
    default:
      break
  }
}

// 新增用户
const addUserFn = () => {
  dialogVisible.value = true
  isViewMode.value = false
  isEditMode.value = false
  userForm.value = initUserForm()
}

// 提交用户表单
const submitUser = async (formData) => {
  try {
    let result
    if (formData.id) {
      // 更新用户
      result = await updateUser(formData.id, formData)
    } else {
      // 创建新用户
      result = await createUser(formData)
    }

    // 当前格式处理：直接返回用户对象
    // 统一格式处理（注释）：如果返回 {success, payload: {data: {...}}, ...}
    // const success = result?.success !== false
    const success = result?.success !== false || !!result?.data

    if (success) {
      ElMessage.success(formData.id ? '更新用户成功' : '新增用户成功')
      dialogVisible.value = false
      searchHandler()
      userForm.value = initUserForm()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    // 当前格式处理：错误信息可能在 error.response?.data?.detail 或 error.response?.data?.message
    // 统一格式处理（注释）：如果返回 {success: false, message, code}，使用 error.response?.data?.message
    ElMessage.error('保存失败：' + (error.response?.data?.detail || error.response?.data?.message || error.message))
  }
}


// 导出用户数据
// const exportUsers = () => {
//   try {
//     const exportData = userList.value.map(user => ({
//       'ID': user.id,
//       '用户名': user.username,
//       '邮箱': user.email,
//       '全名': user.full_name,
//       '状态': user.is_active ? '启用' : '禁用',
//       '类型': user.is_superuser ? '超级管理员' : '普通用户',
//       '创建时间': formatDateTime(user.created_at)
//     }))

//     // 使用已有的 jsonToExcel 导出工具
//     jsonToExcel(exportData)
//     ElMessage.success('导出成功')
//   } catch (error) {
//     console.error('导出失败:', error)
//     ElMessage.error('导出失败，请稍后重试')
//   }
// }

// 权限常量供模板使用
// 由于在script setup中定义，可以直接在模板中使用
</script>

<style scoped lang="less">
.user-mgt-container {
  height: 100vh;
  background-color: #fff;
  padding: 20px;

  .search-title {
    overflow: hidden;

    .search-input {
      float: left;
      width: 300px;
      margin-right: 20px;
    }

    .search-btn {
      float: left;
      margin-right: 10px;
    }

    .new-user {
      float: right;
      margin-left: 10px;
    }


    .export-btn {
      float: right;
    }
  }

  .user-table {
    margin-top: 20px;
    width: 100%;
  }

  .pagination {
    float: right;
    margin-top: 20px;
  }
}

.ellipsis {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
