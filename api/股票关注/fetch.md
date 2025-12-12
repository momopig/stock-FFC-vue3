## 股票关注

#### 多条件多分页查询关注列表

- GET /stock-api/api/stock-watchlist/
- 请求参数
  - page: 页码
  - page_size: 每页数量
  - stock_name: 股票名称模糊查询
  - stock_code: 股票代码模糊查询
  - exchange_code: 交易所代码（SH/SZ/HK/US）
  - status: 股票状态（active/inactive）
  - add_method: 添加方式（manual/strategy/import/other）
  - priority_level: 优先级（1-10）
  - created_by: 创建者筛选
- 响应结果

```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "total": 3,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "id": 3,
        "stock_code": "",
        "stock_name": "",
        "exchange_code": "SH",
        "add_reason": "string",
        "add_method": "manual",
        "add_time": "2025-12-10T12:28:05.096250",
        "initial_price": "0.0000",
        "status": "active",
        "priority_level": 1,
        "notes": "string",
        "created_by": "system",
        "updated_time": "2025-12-10T12:28:05.096258"
      },
    ]
  }
}
```

#### 根据ID获取关注股票详情

- GET /stock-api/api/stock-watchlist/{stock_id}
- 请求参数
  - stock_id: 股票ID
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "id": 3,
    "stock_code": "",
    "stock_name": "",
    "exchange_code": "SH",
    "add_reason": "string",
    "add_method": "manual",
    "add_time": "2025-12-10T12:28:05.096250",
    "initial_price": "0.0000",
    "status": "active",
    "priority_level": 1,
    "notes": "string",
    "created_by": "system",
    "updated_time": "2025-12-10T12:28:05.096258"
  }
}
```

#### 根据ID更新关注股票

- PATCH /stock-api/api/stock-watchlist/{stock_id}
- 请求参数
  - stock_id: 股票ID
  - data: 更新数据
  - 更新数据字段
    - status: 股票状态（active/inactive）
    - priority_level: 优先级（1-10）
    - notes: 备注
    - add_reason: 添加原因
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
}
```

#### 根据ID删除关注股票

- DELETE /stock-api/api/stock-watchlist/{stock_id}
- 请求参数
  - stock_id: 股票ID
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
}
```
