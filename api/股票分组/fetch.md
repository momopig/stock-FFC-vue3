## 股票分组

#### 列出当前用户的分组
- GET /api/stock-groups/user-groups
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "items": [
      {
        "name": "自选",
        "is_hidden": false,
        "display_order": 0,
        "remark": null,
        "id": 2,
        "user_id": 2,
        "create_type": "system",
        "created_at": "2026-01-21T12:25:33.224227",
        "updated_at": "2026-01-21T12:25:33.224234"
      }
    ]
  }
}
```

#### 创建股票分组
- POST /api/stock-groups/user-groups
- 请求参数
  - name: 分组名称
  - is_hidden: 是否隐藏
  - display_order: 显示顺序 Default: 0；展示顺序，越小越靠前
  - remark: 备注
  - create_type: 创建类型：system/custom；system 表示内置；Default"custom"
```json
{
  "name": "能源",
  "is_hidden": false,
  "display_order": 0,
  "remark": "test",
  "create_type": "custom"
}
```

- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "name": "能源",
    "is_hidden": false,
    "display_order": 0,
    "remark": "test",
    "id": 3,
    "user_id": 2,
    "create_type": "custom",
    "created_at": "2026-01-21T12:33:50.608772",
    "updated_at": "2026-01-21T12:33:50.608777"
  }
}
```

#### 更新股票分组
- PUT /api/stock-groups/user-groups/{group_id}
- 请求参数
  - group_id: 分组ID
  - name: 分组名称
  - is_hidden: 是否隐藏
  - display_order: 显示顺序
  - remark: 备注
```json
{
  "name": "能源",
  "is_hidden": false,
  "display_order": 0,
  "remark": "test1"
}
```
- 响应结果
```json
{
  "success": true,
  "code": 0,
  "message": "string",
  "payload": {
    "name": "string",
    "is_hidden": false,
    "display_order": 0,
    "remark": "string",
    "id": 0,
    "user_id": 0,
    "create_type": "system",
    "created_at": "2026-01-21T12:35:57.381Z",
    "updated_at": "2026-01-21T12:35:57.381Z"
  }
}
```

#### 删除股票分组
- DELETE /api/stock-groups/user-groups/{group_id}
- 请求参数
  - group_id: 分组ID
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "message": "分组已删除"
  }
}
```

#### 批量调整分组顺序
- POST /api/stock-groups/user-groups/reorder
- 请求参数
  - id: 分组ID
  - display_order: 显示顺序
```json
[
  {
    "id": 2,
    "display_order": 1
  },
 {
    "id": 4,
    "display_order": 0
  }
]
```
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "message": "分组顺序已更新"
  }
}
```

#### 股票加入多个分组
- POST /api/stock-groups/stocks
- 请求参数
    - group_ids: 分组ID列表
    - exchange_code: 交易所代码（SH/SZ/HK/US）
    - stock_code: 股票代码
    - stock_name: 股票名称
    - initial_price: 初始价格，非必填
    - add_reason: 添加原因，非必填
    - remark: 备注，非必填
```json
{
  "group_ids": [
    2, 4
  ],
  "exchange_code": "SZ",
  "stock_code": "002044.SZ",
  "stock_name": "美年健康",
  "initial_price": 0,
  "add_reason": "多头向上",
  "remark": "测试"
}
```
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "added": 2,
    "skipped": 0
  }
}
```

#### 查询分组内股票（含行情）
- GET /api/stock-groups/{group_id}/stocks
- 请求参数
  - group_id: 分组ID
  - exchange_code: 交易所代码（SH/SZ/HK/US），搜索字段非必填
  - stock_code: 股票代码，搜索字段非必填
  - stock_name: 股票名称，搜索字段非必填
  - page: 页码
  - page_size: 每页数量

api/stock-groups/2/stocks?page=1&page_size=20&exchange_code=SZ&stock_code=002044.SZ&stock_name=美年健康

- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "total": 1,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": 2,
        "user_id": 2,
        "group_id": 2,
        "exchange_code": "SZ",
        "stock_code": "002044.SZ",
        "stock_name": "美年健康",
        "initial_price": "0.0000",
        "add_reason": "多头向上",
        "remark": "测试",
        "joined_at": "2026-01-21T12:46:38.296984",
        "updated_at": "2026-01-21T12:46:38.296990",
        "quote": { // 行情数据
        }
      }
    ]
  }
}
```

#### 从分组移除股票
- DELETE /api/stock-groups/stocks/{stock_id}
- 请求参数
  - item_id : 分组内的数据id，不是股票ID
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "message": "股票已移除"
  }
}

#### 更新分组内股票备注
- PATCH /api/stock-groups/stocks/{item_id}
- 请求参数
  - item_id: 分组内的数据id，不是股票ID
  - remark: 备注
```json
{
  "add_reason": "多头向上2",
  "remark": "string",
  "initial_price": 20
}
```
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "id": 2,
    "user_id": 2,
    "group_id": 2,
    "exchange_code": "SZ",
    "stock_code": "002044.SZ",
    "stock_name": "美年健康",
    "initial_price": "20.0000",
    "add_reason": "多头向上2",
    "remark": "string",
    "joined_at": "2026-01-21T12:46:38.296984",
    "updated_at": "2026-01-21T13:13:06.472562"
  }
}
```
