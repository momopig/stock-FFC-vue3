## 用户管理(接口未按照统一格式返回，先这样调试)

#### 获取用户列表
- GET /api/users
- 请求参数
  - page: 页码
  - page_size: 每页数量
- 响应结果
```json
{
  "total": 0,
  "page": 0,
  "page_size": 0,
  "items": [
    {
      "username": "string",
      "email": "user@example.com",
      "full_name": "string",
      "id": 0,
      "is_active": true,
      "is_superuser": true,
      "created_at": "2025-12-18T12:13:04.568Z",
      "updated_at": "2025-12-18T12:13:04.568Z"
    }
  ]
}
```

#### 创建用户
- POST /api/users
- 请求参数
  - username: 用户名
  - email: 邮箱
  - full_name: 全名
  - password: 密码
  - is_active: 是否激活
  - is_superuser: 是否超级管理员
- 响应结果
```json
{
  "username": "icodeajk",
  "email": "user@example.com",
  "full_name": "string",
  "id": 3,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-12-18T12:16:19.704582",
  "updated_at": "2025-12-18T12:16:19.704588"
}
```

#### 获取用户详情
- GET /api/users/{user_id}
- 请求参数
  - user_id: 用户ID
- 响应结果
```json
{
  "username": "icodeajk",
  "email": "user@example.com",
  "full_name": "string",
  "id": 3,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-12-18T12:16:19.704582",
  "updated_at": "2025-12-18T12:16:19.704588"
}
```

#### 更新用户
- PATCH /api/users/{user_id}
- 请求参数
  - user_id: 用户ID
  - username: 用户名
  - email: 邮箱
  - full_name: 全名
  - password: 密码
  - is_active: 是否激活
  - is_superuser: 是否超级管理员
- 响应结果
```json
{
  "username": "icodeajk",
  "email": "user@example.com",
  "full_name": "string",
  "id": 3,
  "is_active": true,
  "is_superuser": false,
  "created_at": "2025-12-18T12:16:19.704582",
  "updated_at": "2025-12-18T12:16:19.704588"
}
```

#### 删除用户
- DELETE /api/users/{user_id}
- 请求参数
  - user_id: 用户ID
- 响应结果
```json
{
  "message": "用户已删除"
}
```
