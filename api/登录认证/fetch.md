## 登录认证(接口未按照统一格式返回，先这样调试)

#### 用户登录
- POST /api/auth/login
- 请求参数
  - username: 用户名
  - password: 密码
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwiZXhwIjoxNzY2MTQ2MTA3fQ.faazj__4lq1BLNVTKg96T1rmJwQkFMYsBkjz6oEl45s",
  "token_type": "bearer"
}
```

#### 获取当前登录用户
- GET /api/auth/me
```json
{
  "username": "ajk",
  "email": "ajk@example.com",
  "full_name": "string",
  "id": 2,
  "is_active": true,
  "is_superuser": true,
  "created_at": "2025-12-15T16:59:10.374270",
  "updated_at": "2025-12-15T16:59:10.374277"
}
```

