## 策略管理

#### 获取策略列表
- GET /api/strategy/
- 请求参数
  - name: 策略名称
  - type: 策略类型（system/custom）
  - enabled: 是否开启（true/false）
  - page: 页码
  - page_size: 每页数量
- 响应结果
```json
{
  "success": true,
  "code": 0,
  "message": "string",
  "payload": {
    "total": 0,
    "page": 0,
    "page_size": 0,
    "items": [
      {
        "name": "string",
        "type": "system",
        "description": "string",
        "selector_conditions": "string",
        "execute_time": "string",
        "execute_cycle": "string",
        "enabled": true,
        "id": 0,
        "created_time": "2025-12-29T11:28:55.908Z",
        "updated_time": "2025-12-29T11:28:55.908Z"
      }
    ]
  }
}
```

<!-- #### 创建策略
- POST /api/strategy/
- 请求参数
  - name: 策略名称
  - type: 策略类型（system/custom）
  - description: 策略描述
  - selector_conditions: 选股器条件（JSON）
  - execute_time: 执行时间点（如 09:30）
  - execute_cycle: 执行周期（daily/weekly/monthly）
  - enabled: 是否开启（true/false）
- 响应结果
```json
{
  "success": true,
  "code": 0,
  "message": "string",
  "payload": "string"
}
``` -->

