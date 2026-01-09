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

#### 变更股票状态

- PATCH /stock-api/api/stock-watchlist/{stock_id}/status?status={status}
- 请求参数
  - stock_id: 股票ID
  - status: 股票状态（active/inactive）
- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
}
```


#### 多条件多分页查询关注股票并补充行情（WebSocket）
- WebSocket ws://{host}/stock-api/api/stock-watchlist/with-quotes
- 请求参数（通过 URL 查询参数传递）
  - exchange_code: 交易所代码（SH/SZ/HK/US），可选
  - status: 股票状态（active/inactive），可选
  - add_method: 添加方式（manual/strategy/import/other），可选
  - priority_level: 优先级（1-10），可选
  - stock_name: 股票名称模糊查询，可选
  - stock_code: 股票代码模糊查询，可选
  - created_by: 创建者筛选，可选
  - page: 页码，必填
  - page_size: 每页数量，必填
  - interval: 推送间隔（秒），<=0 则只推一次，默认 3
  - once_if_closed: 非交易时段是否只推一次，默认 false

- 响应结果
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "payload": {
    "total": 1,
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
        "updated_time": "2025-12-10T12:28:05.096258",
        quote: {
          {
            "code": "SZ.300303",
            "name": "聚飞光电",
            "last_price": 7.02,
            "change_rate": 0.29,
            "turnover_rate": 3.961,
            "turnover": 369451473.45,
            "volume": 52601151,
            "volume_ratio": 1.35,
            "circular_market_val": 9322545861.72,
            "circular_market_val_yi": 93.23,
            "high_price": 7.1,
            "low_price": 6.96,
            "time": "2026-01-09 15:00:00",
            "ma_response": {
              "stock_code": "SZ.300303",
              "stock_name": "SZ.300303",
              "ma_data": {
                "MA1": 7.02,
                "MA2": 7.01,
                "MA3": 6.99,
                "MA4": 7,
                "MA5": 6.99,
                "MA6": 6.96,
                "MA7": 6.95,
                "MA8": 6.94,
                "MA9": 6.93,
                "MA10": 6.94,
                "MA11": 6.94,
                "MA12": 6.94,
                "MA13": 6.94,
                "MA14": 6.93,
                "MA15": 6.92,
                "MA16": 6.91,
                "MA17": 6.9,
                "MA18": 6.9,
                "MA19": 6.9,
                "MA20": 6.91
              },
              "kline_data": [
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-11 00:00:00",
                  "open": 7.09,
                  "close": 7.05,
                  "high": 7.19,
                  "low": 7.01,
                  "volume": 75875032,
                  "turnover": 538274692.05,
                  "pe_ratio": 30.921,
                  "turnover_rate": 0.05713,
                  "last_close": 7.12
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-12 00:00:00",
                  "open": 7.01,
                  "close": 6.97,
                  "high": 7.08,
                  "low": 6.93,
                  "volume": 58860177,
                  "turnover": 412653989.05,
                  "pe_ratio": 30.57,
                  "turnover_rate": 0.04432,
                  "last_close": 7.05
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-15 00:00:00",
                  "open": 6.93,
                  "close": 6.84,
                  "high": 6.95,
                  "low": 6.83,
                  "volume": 41978460,
                  "turnover": 288971783.65,
                  "pe_ratio": 30,
                  "turnover_rate": 0.03161,
                  "last_close": 6.97
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-16 00:00:00",
                  "open": 6.85,
                  "close": 6.73,
                  "high": 6.87,
                  "low": 6.67,
                  "volume": 35408688,
                  "turnover": 238447731.91,
                  "pe_ratio": 29.517,
                  "turnover_rate": 0.02666,
                  "last_close": 6.84
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-17 00:00:00",
                  "open": 6.74,
                  "close": 6.8,
                  "high": 6.82,
                  "low": 6.57,
                  "volume": 42993289,
                  "turnover": 288189342.12,
                  "pe_ratio": 29.824,
                  "turnover_rate": 0.03237,
                  "last_close": 6.73
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-18 00:00:00",
                  "open": 6.73,
                  "close": 6.8,
                  "high": 6.93,
                  "low": 6.72,
                  "volume": 35848148,
                  "turnover": 245037598.72,
                  "pe_ratio": 29.824,
                  "turnover_rate": 0.02699,
                  "last_close": 6.8
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-19 00:00:00",
                  "open": 6.84,
                  "close": 6.8,
                  "high": 6.88,
                  "low": 6.75,
                  "volume": 32682695,
                  "turnover": 222544798.74,
                  "pe_ratio": 29.824,
                  "turnover_rate": 0.02461,
                  "last_close": 6.8
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-22 00:00:00",
                  "open": 6.85,
                  "close": 6.98,
                  "high": 7.02,
                  "low": 6.83,
                  "volume": 48423011,
                  "turnover": 337535517.39,
                  "pe_ratio": 30.614,
                  "turnover_rate": 0.03646,
                  "last_close": 6.8
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-23 00:00:00",
                  "open": 6.98,
                  "close": 6.89,
                  "high": 7.01,
                  "low": 6.86,
                  "volume": 32769774,
                  "turnover": 226907304.64,
                  "pe_ratio": 30.219,
                  "turnover_rate": 0.02468,
                  "last_close": 6.98
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-24 00:00:00",
                  "open": 6.9,
                  "close": 6.98,
                  "high": 7.01,
                  "low": 6.89,
                  "volume": 34340779,
                  "turnover": 239283910.84,
                  "pe_ratio": 30.614,
                  "turnover_rate": 0.02586,
                  "last_close": 6.89
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-25 00:00:00",
                  "open": 7,
                  "close": 6.97,
                  "high": 7.07,
                  "low": 6.95,
                  "volume": 35038974,
                  "turnover": 245090209.73,
                  "pe_ratio": 30.57,
                  "turnover_rate": 0.02638,
                  "last_close": 6.98
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-26 00:00:00",
                  "open": 6.95,
                  "close": 6.9,
                  "high": 7,
                  "low": 6.88,
                  "volume": 37505393,
                  "turnover": 260259881.61,
                  "pe_ratio": 30.263,
                  "turnover_rate": 0.02824,
                  "last_close": 6.97
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-29 00:00:00",
                  "open": 6.93,
                  "close": 6.82,
                  "high": 6.93,
                  "low": 6.81,
                  "volume": 26745178,
                  "turnover": 183452937.08,
                  "pe_ratio": 29.912,
                  "turnover_rate": 0.02014,
                  "last_close": 6.9
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-30 00:00:00",
                  "open": 6.82,
                  "close": 6.87,
                  "high": 6.99,
                  "low": 6.8,
                  "volume": 32592700,
                  "turnover": 225538929.39,
                  "pe_ratio": 30.131,
                  "turnover_rate": 0.02454,
                  "last_close": 6.82
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2025-12-31 00:00:00",
                  "open": 6.89,
                  "close": 6.84,
                  "high": 6.9,
                  "low": 6.81,
                  "volume": 27753767,
                  "turnover": 190250947.53,
                  "pe_ratio": 30,
                  "turnover_rate": 0.0209,
                  "last_close": 6.87
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2026-01-05 00:00:00",
                  "open": 6.87,
                  "close": 6.93,
                  "high": 6.99,
                  "low": 6.84,
                  "volume": 33830403,
                  "turnover": 233747902.9,
                  "pe_ratio": 30.394,
                  "turnover_rate": 0.02547,
                  "last_close": 6.84
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2026-01-06 00:00:00",
                  "open": 6.95,
                  "close": 7.05,
                  "high": 7.06,
                  "low": 6.92,
                  "volume": 51843118,
                  "turnover": 363785515.72,
                  "pe_ratio": 30.921,
                  "turnover_rate": 0.03904,
                  "last_close": 6.93
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2026-01-07 00:00:00",
                  "open": 7.08,
                  "close": 6.95,
                  "high": 7.1,
                  "low": 6.93,
                  "volume": 40139038,
                  "turnover": 280295609.47,
                  "pe_ratio": 30.482,
                  "turnover_rate": 0.03023,
                  "last_close": 7.05
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2026-01-08 00:00:00",
                  "open": 6.97,
                  "close": 7,
                  "high": 7.03,
                  "low": 6.93,
                  "volume": 40498013,
                  "turnover": 283282378.56,
                  "pe_ratio": 30.701,
                  "turnover_rate": 0.0305,
                  "last_close": 6.95
                },
                {
                  "code": "SZ.300303",
                  "name": "聚飞光电",
                  "time_key": "2026-01-09 00:00:00",
                  "open": 7,
                  "close": 7.02,
                  "high": 7.1,
                  "low": 6.96,
                  "volume": 53313151,
                  "turnover": 374449713.45,
                  "pe_ratio": 30.789,
                  "turnover_rate": 0.03961,
                  "last_close": 7
                }
              ]
            }
          }
        }
      },
    ]
  }
}
```
