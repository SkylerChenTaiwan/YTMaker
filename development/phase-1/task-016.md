# Task-016: WebSocket 即時進度推送

> **建立日期：** 2025-10-19
> **狀態：** ⏳ 未開始
> **預計時間：** 6 小時
> **優先級：** P0 (必須)

---

## 關聯文件

### 技術規格
- **API 設計：** `tech-specs/backend/api-design.md#WebSocket`

### 相關任務
- **前置任務:** Task-014 ✅ (Celery 任務)
- **後續任務:** Task-024 (進度監控頁面)

---

## 任務目標

### 簡述
實作 WebSocket 端點，即時推送生成進度、日誌、錯誤訊息。

### 成功標準
- [x] WebSocket 端點實作完成
- [x] Redis Pub/Sub 整合完成
- [x] 連線管理完成
- [x] 進度訊息格式定義完成

---

## WebSocket 端點

```python
@app.websocket("/ws/projects/{project_id}/progress")
async def progress_websocket(websocket: WebSocket, project_id: int):
    await websocket.accept()

    # 訂閱 Redis channel
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(f"progress:{project_id}")

    try:
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        await pubsub.unsubscribe(f"progress:{project_id}")
```

---

## 進度訊息格式

```json
{
  "stage": "SCRIPT_GENERATING",
  "progress": 20,
  "message": "正在生成腳本...",
  "timestamp": "2025-10-19T10:30:00Z"
}
```

---

## 完成檢查清單

- [ ] WebSocket 端點完成
- [ ] Redis Pub/Sub 整合完成
- [ ] 連線管理完成
- [ ] 心跳檢測完成
- [ ] 單元測試完成
