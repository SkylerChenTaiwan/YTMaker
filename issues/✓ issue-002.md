# [已解決] Issue-002: Phase 1 測試覆蓋率不足問題

> **建立日期:** 2025-10-20
> **狀態:** 🟢 Resolved
> **優先級:** P0 緊急
> **分類:** Testing
> **負責人:** Skyler

---

## 問題描述

### 簡述
在開發執行前的測試規劃審查中,發現多個任務的測試規劃存在覆蓋率不足、缺少關鍵測試案例等問題。這些問題如果不在開發前修正,將影響整個 TDD 流程的有效性。

### 詳細說明
測試品質整體評分: **B+ (85/100)**

發現以下三大類問題:

1. **個別任務測試不足** (7 個任務)
2. **整合測試缺口** (3 個主要領域)
3. **測試覆蓋率不均** (多個數據流覆蓋率 55%-73%,未達 80% 目標)

### 發現時機
- **階段:** 開發前測試規劃審查
- **任務:** 準備開始 Phase 1 開發
- **檔案:** `development/phase-1/task-*.md`
- **功能:** 所有 Phase 1 任務的測試規劃

---

## 環境資訊

**環境:**
- 階段: 設計階段(尚未開發)
- 影響範圍: Phase 1 全部 30 個任務

**相關版本:**
- 專案版本/Commit: 當前 development/phase-1 版本
- 相關文件: Phase 1 所有 task 文件

---

## 問題詳細分析

### 一、個別任務測試問題

#### 1. Task-001: 專案初始化

**問題描述:**
- ❌ 缺少配置檔案正確性驗證
- ❌ 缺少跨平台特定測試 (Windows/macOS/Linux)

**影響:**
- 無法確保初始化配置符合 spec 規範
- 跨平台部署時可能出現路徑或環境變數問題

**建議新增測試:**

```typescript
// 測試 6: 配置檔案正確性驗證
test('配置檔案應符合 spec 規範', () => {
  const config = loadConfig()

  // 驗證結構
  expect(config).toMatchSchema(configSchema)

  // 驗證關鍵設定
  expect(config.CORS_ORIGINS).toContain('http://localhost:3000')
  expect(config.DATABASE_URL).toMatch(/^postgresql:\/\//)
  expect(config.CELERY_BROKER_URL).toMatch(/^redis:\/\//)
})

// 測試 7: 跨平台路徑處理
test('不同作業系統的路徑應正確處理', () => {
  const configs = {
    win32: loadConfig({ platform: 'win32' }),
    darwin: loadConfig({ platform: 'darwin' }),
    linux: loadConfig({ platform: 'linux' })
  }

  // Windows 應使用反斜線
  expect(configs.win32.UPLOAD_DIR).toMatch(/\\/)

  // Unix-like 應使用正斜線
  expect(configs.darwin.UPLOAD_DIR).toMatch(/\//)
  expect(configs.linux.UPLOAD_DIR).toMatch(/\//)
})
```

**優先級:** 低 (如果只部署單一平台可延後)

---

#### 2. Task-004: Projects API CRUD

**問題描述:**
- ❌ 缺少並發更新測試
- ❌ 缺少分頁邊界測試

**影響:**
- 多用戶同時編輯專案時可能發生資料競態條件
- 大量專案時分頁功能可能出現邊界錯誤

**建議新增測試:**

```python
# 測試 8: 並發更新處理
async def test_concurrent_updates():
    """兩個請求同時更新同一專案,應有樂觀鎖或序列化處理"""
    project_id = "test-id"

    async def update_name(new_name):
        return await client.put(
            f"/api/v1/projects/{project_id}/configuration",
            json={"subtitle": {"font_size": new_name}}
        )

    # 並發執行
    results = await asyncio.gather(
        update_name(40),
        update_name(50)
    )

    # 兩個請求都應成功(不應死鎖)
    assert all(r.status_code == 200 for r in results)

    # 最終狀態應一致(不應有部分更新)
    final = await client.get(f"/api/v1/projects/{project_id}")
    assert final.json()["configuration"]["subtitle"]["font_size"] in [40, 50]

# 測試 9: 分頁邊界測試
async def test_pagination_boundaries():
    """測試分頁在邊界條件下的正確性"""
    # 創建 100 個專案
    for i in range(100):
        await client.post("/api/v1/projects", json={
            "title": f"Project {i}",
            "script_content": f"Content {i}"
        })

    # 測試最後一頁(可能不滿)
    last_page = await client.get("/api/v1/projects?page=10&page_size=10")
    assert last_page.status_code == 200
    assert len(last_page.json()["items"]) == 0  # 第 10 頁應為空

    # 測試超出範圍的頁碼
    out_of_range = await client.get("/api/v1/projects?page=999")
    assert out_of_range.status_code == 200
    assert len(out_of_range.json()["items"]) == 0

    # 測試 page_size=1 的邊界
    single = await client.get("/api/v1/projects?page_size=1")
    assert len(single.json()["items"]) == 1
```

**優先級:** 高 (資料一致性關鍵)

---

#### 3. Task-009: Batch API 批次處理

**問題描述:**
- ❌ 缺少批次進度並發更新測試
- ❌ 缺少部分失敗處理驗證

**影響:**
- 多個 Celery worker 同時更新批次進度時可能產生競態
- 批次中部分項目失敗時,無法確保正確的失敗處理和狀態記錄

**建議新增測試:**

```python
# 測試 8: 批次進度並發更新
async def test_batch_progress_concurrent_updates():
    """多個 worker 同時更新批次進度,應正確累加"""
    batch_id = "test-batch"

    # 模擬 3 個 worker 同時完成項目
    async def complete_item(item_index):
        return await client.post(
            f"/api/v1/batches/{batch_id}/progress",
            json={"completed_item": item_index}
        )

    results = await asyncio.gather(
        complete_item(0),
        complete_item(1),
        complete_item(2)
    )

    # 所有更新都應成功
    assert all(r.status_code == 200 for r in results)

    # 進度應正確累加到 3
    status = await client.get(f"/api/v1/batches/{batch_id}")
    assert status.json()["completed_items"] == 3

# 測試 9: 部分失敗處理
async def test_batch_partial_failure():
    """批次中部分項目失敗,應記錄失敗原因並繼續處理其他項目"""
    batch = await client.post("/api/v1/batches", json={
        "items": [
            {"project_id": "valid-1"},
            {"project_id": "invalid"},  # 這個會失敗
            {"project_id": "valid-2"}
        ]
    })
    batch_id = batch.json()["batch_id"]

    # 等待批次完成
    await wait_for_batch_completion(batch_id, timeout=30)

    # 檢查最終狀態
    result = await client.get(f"/api/v1/batches/{batch_id}")
    data = result.json()

    assert data["status"] == "partial_failure"
    assert data["completed_items"] == 2
    assert data["failed_items"] == 1
    assert len(data["errors"]) == 1
    assert "invalid" in data["errors"][0]["project_id"]
```

**優先級:** 高 (影響批次任務可靠性)

---

#### 4. Task-015: FFmpeg 影片渲染服務

**問題描述:**
- ❌ 缺少音訊同步精度測試 (要求 <0.5 秒)
- ❌ 缺少效能基準測試
- ❌ 缺少記憶體洩漏測試

**影響:**
- 無法確保音訊與字幕的同步精度符合 spec 要求
- 長時間或大批次渲染時可能出現效能問題或記憶體洩漏

**建議新增測試:**

```python
# 測試 11: 音訊同步精度測試
def test_audio_sync_accuracy():
    """驗證音訊與字幕的同步精度在 0.5 秒內"""
    # 準備測試資料
    audio_segments = [
        {"file": "seg1.mp3", "start_time": 0.0, "duration": 5.2},
        {"file": "seg2.mp3", "start_time": 5.2, "duration": 3.8}
    ]
    subtitles = [
        {"text": "First", "start": 0.0, "end": 5.2},
        {"text": "Second", "start": 5.2, "end": 9.0}
    ]

    # 渲染影片
    output = render_video(audio_segments, subtitles)

    # 使用 FFprobe 分析輸出影片
    analysis = ffprobe_analyze(output)

    # 檢查每個字幕的時間戳
    for i, sub in enumerate(subtitles):
        actual_start = analysis["subtitles"][i]["start"]
        expected_start = sub["start"]

        # 同步誤差必須 < 0.5 秒
        assert abs(actual_start - expected_start) < 0.5, \
            f"字幕 {i} 同步誤差 {abs(actual_start - expected_start)}s 超過 0.5s"

# 測試 12: 效能基準測試
def test_rendering_performance():
    """驗證渲染效能符合基準要求"""
    import time

    # 測試場景: 10 分鐘影片,50 個字幕,20 個音訊片段
    start_time = time.time()

    result = render_video(
        audio_segments=generate_test_audio(count=20),
        subtitles=generate_test_subtitles(count=50),
        duration=600  # 10 分鐘
    )

    elapsed = time.time() - start_time

    # 應在合理時間內完成 (假設 < 60 秒)
    assert elapsed < 60, f"渲染時間 {elapsed}s 超過預期"

    # 檢查輸出品質
    assert result["resolution"] == "1920x1080"
    assert result["fps"] == 30

# 測試 13: 記憶體洩漏測試
def test_memory_leak():
    """連續渲染多個影片,記憶體使用應穩定"""
    import psutil
    import gc

    process = psutil.Process()
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB

    # 連續渲染 10 個影片
    for i in range(10):
        render_video(
            audio_segments=generate_test_audio(count=5),
            subtitles=generate_test_subtitles(count=10),
            duration=60
        )
        gc.collect()  # 強制垃圾回收

    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_increase = final_memory - initial_memory

    # 記憶體增長應 < 100 MB
    assert memory_increase < 100, \
        f"記憶體洩漏: 增長 {memory_increase} MB"
```

**優先級:** 高 (核心功能要求)

---

#### 5. Task-022: 視覺化配置頁面

**問題描述:**
- ❌ 缺少即時預覽效能驗證 (要求 <100ms)
- ❌ 缺少拖曳邊界測試

**影響:**
- 無法確保配置修改時預覽更新的流暢度
- 拖曳操作在邊界情況下可能出現 UI 錯誤

**建議新增測試:**

```typescript
// 測試 14: 即時預覽效能
test('配置修改後預覽應在 100ms 內更新', async () => {
  const { user } = render(<VisualConfigPage />)

  const fontSizeInput = screen.getByLabelText('字體大小')
  const preview = screen.getByTestId('preview-container')

  // 記錄開始時間
  const startTime = performance.now()

  // 修改配置
  await user.clear(fontSizeInput)
  await user.type(fontSizeInput, '48')

  // 等待預覽更新
  await waitFor(() => {
    const previewFontSize = window.getComputedStyle(
      preview.querySelector('.subtitle')
    ).fontSize
    expect(previewFontSize).toBe('48px')
  })

  const elapsed = performance.now() - startTime

  // 更新時間應 < 100ms
  expect(elapsed).toBeLessThan(100)
})

// 測試 15: 拖曳邊界測試
test('字幕位置拖曳到畫面邊界應正確限制', async () => {
  const { user } = render(<VisualConfigPage />)

  const subtitle = screen.getByTestId('draggable-subtitle')
  const container = screen.getByTestId('video-preview')
  const containerRect = container.getBoundingClientRect()

  // 嘗試拖曳到畫面外
  await user.pointer([
    { keys: '[MouseLeft>]', target: subtitle },
    { coords: {
      x: containerRect.right + 100,  // 超出右邊界
      y: containerRect.bottom + 100  // 超出下邊界
    }},
    { keys: '[/MouseLeft]' }
  ])

  // 位置應被限制在畫面內
  const finalRect = subtitle.getBoundingClientRect()
  expect(finalRect.right).toBeLessThanOrEqual(containerRect.right)
  expect(finalRect.bottom).toBeLessThanOrEqual(containerRect.bottom)

  // 左上角也應在畫面內
  expect(finalRect.left).toBeGreaterThanOrEqual(containerRect.left)
  expect(finalRect.top).toBeGreaterThanOrEqual(containerRect.top)
})
```

**優先級:** 中 (影響使用者體驗)

---

#### 6. Task-024: 進度監控頁面

**問題描述:**
- ❌ 缺少 WebSocket 重連後訊息恢復測試
- ❌ 缺少訊息順序測試

**影響:**
- WebSocket 斷線重連後可能遺失進度更新
- 訊息亂序可能導致進度顯示錯誤

**建議新增測試:**

```typescript
// 測試 16: WebSocket 重連後訊息恢復
test('WebSocket 斷線重連後應恢復遺失的進度', async () => {
  const { rerender } = render(<ProgressMonitorPage />)

  // 建立初始連線
  await waitFor(() => {
    expect(screen.getByTestId('ws-status')).toHaveTextContent('已連線')
  })

  // 模擬進度從 0% 到 30%
  mockWebSocket.send({ type: 'progress', value: 0.3 })
  await waitFor(() => {
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('value', '30')
  })

  // 模擬斷線
  mockWebSocket.close()
  await waitFor(() => {
    expect(screen.getByTestId('ws-status')).toHaveTextContent('重新連線中')
  })

  // 在斷線期間,後端進度從 30% 到 70%
  // (這些訊息前端沒收到)

  // 重新連線
  mockWebSocket.reconnect()

  // 重連後應立即收到最新進度
  await waitFor(() => {
    expect(screen.getByTestId('progress-bar')).toHaveAttribute('value', '70')
  }, { timeout: 3000 })
})

// 測試 17: 訊息順序測試
test('亂序到達的 WebSocket 訊息應正確排序', async () => {
  render(<ProgressMonitorPage />)

  await waitFor(() => {
    expect(screen.getByTestId('ws-status')).toHaveTextContent('已連線')
  })

  // 模擬訊息亂序到達
  mockWebSocket.send({
    type: 'progress',
    value: 0.5,
    timestamp: 1000,
    sequence: 2
  })

  mockWebSocket.send({
    type: 'progress',
    value: 0.3,
    timestamp: 500,
    sequence: 1
  })

  mockWebSocket.send({
    type: 'progress',
    value: 0.7,
    timestamp: 1500,
    sequence: 3
  })

  // 等待訊息處理
  await waitFor(() => {
    const logs = screen.getAllByTestId('progress-log-item')
    expect(logs).toHaveLength(3)
  })

  // 檢查顯示順序應按 sequence 排序
  const logs = screen.getAllByTestId('progress-log-item')
  expect(logs[0]).toHaveTextContent('30%')
  expect(logs[1]).toHaveTextContent('50%')
  expect(logs[2]).toHaveTextContent('70%')
})
```

**優先級:** 中 (確保進度正確性)

---

#### 7. Task-029: E2E 整合測試

**問題描述:**
- ❌ 缺少跨流程整合測試
- ❌ 缺少前後端資料一致性測試

**影響:**
- 無法確保不同使用者流程之間的整合正確性
- 前後端資料同步問題可能在整合時才被發現

**建議新增測試:**

```typescript
// 測試 11: 跨流程整合測試
test('批次處理 + 單一專案編輯應互不影響', async ({ page }) => {
  // 1. 建立批次任務 (處理 10 個專案)
  await page.goto('/batch-generation')
  await page.fill('[name="project_count"]', '10')
  await page.click('button:has-text("開始批次生成")')

  const batchId = await page.locator('[data-testid="batch-id"]').textContent()

  // 2. 在批次處理進行中,同時編輯單一專案
  await page.goto('/projects')
  await page.click('text=新增專案')
  await page.fill('[name="title"]', '測試專案')
  await page.fill('[name="script"]', '測試內容')
  await page.click('button:has-text("儲存")')

  const projectId = await page.locator('[data-testid="project-id"]').textContent()

  // 3. 進入視覺化配置
  await page.click(`[data-project-id="${projectId}"]`)
  await page.fill('[name="font_size"]', '48')
  await page.click('button:has-text("儲存配置")')

  // 4. 檢查批次任務沒有被影響
  await page.goto(`/progress/${batchId}`)
  const status = await page.locator('[data-testid="batch-status"]')
  expect(await status.textContent()).toMatch(/進行中|已完成/)

  // 5. 檢查單一專案配置已儲存
  const response = await page.request.get(`/api/v1/projects/${projectId}`)
  const data = await response.json()
  expect(data.configuration.subtitle.font_size).toBe(48)
})

// 測試 12: 前後端資料一致性測試
test('前端顯示應與後端資料庫完全一致', async ({ page }) => {
  // 1. 透過 API 建立專案
  const apiResponse = await page.request.post('/api/v1/projects', {
    data: {
      title: '一致性測試專案',
      script_content: '測試內容',
      configuration: {
        subtitle: {
          font_family: 'Noto Sans TC',
          font_size: 36,
          font_color: '#FFFFFF',
          position: { x: 50, y: 80 }
        }
      }
    }
  })

  const apiData = await apiResponse.json()
  const projectId = apiData.project_id

  // 2. 前端載入專案
  await page.goto(`/projects/${projectId}`)

  // 3. 比對每個欄位
  expect(await page.inputValue('[name="title"]')).toBe('一致性測試專案')
  expect(await page.inputValue('[name="script"]')).toBe('測試內容')
  expect(await page.inputValue('[name="font_family"]')).toBe('Noto Sans TC')
  expect(await page.inputValue('[name="font_size"]')).toBe('36')
  expect(await page.inputValue('[name="font_color"]')).toBe('#FFFFFF')

  // 4. 修改配置
  await page.fill('[name="font_size"]', '48')
  await page.click('button:has-text("儲存")')

  await page.waitForSelector('[data-testid="save-success"]')

  // 5. 直接查詢資料庫驗證
  const updatedResponse = await page.request.get(`/api/v1/projects/${projectId}`)
  const updatedData = await updatedResponse.json()

  expect(updatedData.configuration.subtitle.font_size).toBe(48)

  // 6. 重新載入頁面驗證持久化
  await page.reload()
  expect(await page.inputValue('[name="font_size"]')).toBe('48')
})
```

**優先級:** 低 (Phase 2 可改善)

---

### 二、整合測試缺口

#### 缺口 1: Celery-WebSocket 整合測試

**問題描述:**
目前沒有測試驗證 Celery 後台任務與 WebSocket 推送的完整整合流程。

**影響:**
- Celery 任務狀態更新可能無法正確推送到前端
- 任務失敗時前端可能無法收到通知

**建議新增測試:**

```python
# test_celery_websocket_integration.py

@pytest.mark.integration
async def test_celery_task_progress_pushes_to_websocket():
    """Celery 任務進度應透過 WebSocket 即時推送到前端"""

    # 1. 建立 WebSocket 連線
    async with websockets.connect('ws://localhost:8000/ws') as ws:

        # 2. 訂閱專案進度
        await ws.send(json.dumps({
            'type': 'subscribe',
            'project_id': 'test-project-123'
        }))

        # 3. 觸發 Celery 任務
        task = generate_video.delay('test-project-123')

        # 4. 應收到進度更新
        messages = []
        timeout = time.time() + 30  # 30 秒超時

        while time.time() < timeout:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=1)
                data = json.loads(msg)
                messages.append(data)

                if data.get('status') == 'completed':
                    break
            except asyncio.TimeoutError:
                continue

        # 5. 驗證收到的訊息
        assert len(messages) > 0, "應收到至少一個進度訊息"

        # 應包含 processing 狀態
        assert any(m['status'] == 'processing' for m in messages)

        # 最後應為 completed
        assert messages[-1]['status'] == 'completed'

        # 進度應遞增
        progresses = [m.get('progress', 0) for m in messages if 'progress' in m]
        assert progresses == sorted(progresses), "進度應單調遞增"

@pytest.mark.integration
async def test_celery_task_failure_notifies_websocket():
    """Celery 任務失敗應透過 WebSocket 通知前端"""

    async with websockets.connect('ws://localhost:8000/ws') as ws:
        await ws.send(json.dumps({
            'type': 'subscribe',
            'project_id': 'invalid-project'  # 這會導致失敗
        }))

        # 觸發任務
        task = generate_video.delay('invalid-project')

        # 等待失敗訊息
        timeout = time.time() + 30
        failure_received = False

        while time.time() < timeout:
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=1)
                data = json.loads(msg)

                if data.get('status') == 'failed':
                    failure_received = True
                    assert 'error' in data
                    assert len(data['error']) > 0
                    break
            except asyncio.TimeoutError:
                continue

        assert failure_received, "應收到失敗通知"
```

**相關任務:**
- Task-009 (Batch API)
- Task-015 (Video Rendering)
- Task-024 (Progress Monitor)

**優先級:** 高 (影響使用者體驗)

---

#### 缺口 2: 第三方 API 失敗恢復測試

**問題描述:**
缺少對第三方 API (Gemini, Stability AI, D-ID, YouTube) 失敗後重試和降級策略的整合測試。

**影響:**
- API 失敗時系統可能無法正確處理
- 重試邏輯可能無效或導致雪崩效應

**建議新增測試:**

```python
# test_third_party_api_resilience.py

@pytest.mark.integration
async def test_gemini_api_failure_with_retry():
    """Gemini API 失敗應自動重試,超過上限後返回錯誤"""

    # Mock Gemini API 返回 503 (服務暫時不可用)
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.POST,
            'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
            status=503,
            json={'error': 'Service temporarily unavailable'}
        )

        # 嘗試生成內容
        start_time = time.time()

        with pytest.raises(GeminiAPIError) as exc_info:
            await gemini_service.generate_content('測試提示詞')

        elapsed = time.time() - start_time

        # 應重試 3 次 (初始 + 2 次重試)
        assert len(rsps.calls) == 3

        # 總耗時應包含退避延遲 (例如 1s + 2s = 3s)
        assert elapsed >= 3.0

        # 錯誤訊息應清楚
        assert 'Service temporarily unavailable' in str(exc_info.value)

@pytest.mark.integration
async def test_stability_ai_fallback_to_cached_image():
    """Stability AI 失敗時應回退到快取圖片"""

    # 1. 先成功生成一張圖片並快取
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.POST,
            'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            status=200,
            body=b'fake-image-data'
        )

        image1 = await stability_service.generate_image('a beautiful sunset')
        assert image1 is not None

    # 2. 第二次請求失敗
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.POST,
            'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
            status=500,
            json={'error': 'Internal server error'}
        )

        # 應使用快取的圖片而不是拋出錯誤
        image2 = await stability_service.generate_image(
            'a beautiful sunset',
            allow_cached=True
        )

        assert image2 == image1  # 應返回相同的快取圖片

@pytest.mark.integration
async def test_youtube_upload_quota_exceeded():
    """YouTube API 配額耗盡時應正確處理"""

    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.POST,
            'https://www.googleapis.com/upload/youtube/v3/videos',
            status=403,
            json={
                'error': {
                    'code': 403,
                    'message': 'The request cannot be completed because you have exceeded your quota.'
                }
            }
        )

        # 嘗試上傳
        with pytest.raises(YouTubeQuotaExceededError) as exc_info:
            await youtube_service.upload_video('test-video.mp4')

        # 錯誤應包含重試建議時間
        assert exc_info.value.retry_after is not None
        assert exc_info.value.retry_after > datetime.now()
```

**相關任務:**
- Task-006 (Gemini Integration)
- Task-007 (Stability AI Integration)
- Task-008 (D-ID Integration)
- Task-010 (YouTube Upload)

**優先級:** 中 (提升系統穩定性)

---

#### 缺口 3: 檔案系統錯誤處理測試

**問題描述:**
缺少對檔案系統操作失敗 (磁碟滿、權限不足、檔案鎖定) 的整合測試。

**影響:**
- 磁碟空間不足時可能導致資料損壞
- 檔案權限問題可能導致服務崩潰

**建議新增測試:**

```python
# test_filesystem_error_handling.py

@pytest.mark.integration
def test_disk_full_during_video_rendering():
    """磁碟空間不足時應優雅處理,不損壞已有資料"""

    # Mock 磁碟空間檢查
    with patch('shutil.disk_usage') as mock_disk:
        # 模擬只剩 100MB 空間 (不足以渲染影片)
        mock_disk.return_value = (1000_000_000, 900_000_000, 100_000_000)

        with pytest.raises(InsufficientDiskSpaceError) as exc_info:
            render_service.render_video('test-project')

        # 應提供清楚的錯誤訊息
        assert 'disk space' in str(exc_info.value).lower()
        assert '100' in str(exc_info.value)  # 應顯示剩餘空間

        # 專案資料應完整 (沒有部分寫入的檔案)
        project_dir = Path(f'./uploads/test-project')

        # 不應有 .tmp 或 .partial 檔案
        assert len(list(project_dir.glob('*.tmp'))) == 0
        assert len(list(project_dir.glob('*.partial'))) == 0

@pytest.mark.integration
def test_file_permission_denied():
    """檔案權限不足時應返回明確錯誤"""

    upload_dir = Path('./uploads/test-readonly')
    upload_dir.mkdir(exist_ok=True)

    # 移除寫入權限
    os.chmod(upload_dir, 0o444)

    try:
        with pytest.raises(FilePermissionError) as exc_info:
            file_service.save_uploaded_file(
                b'test content',
                str(upload_dir / 'test.txt')
            )

        # 錯誤訊息應包含路徑
        assert str(upload_dir) in str(exc_info.value)
    finally:
        # 恢復權限以便清理
        os.chmod(upload_dir, 0o755)
        upload_dir.rmdir()

@pytest.mark.integration
async def test_concurrent_file_access():
    """多個請求同時存取同一檔案應正確處理檔案鎖定"""

    test_file = Path('./uploads/shared-file.txt')
    test_file.write_text('initial content')

    async def write_to_file(content):
        # 使用檔案鎖定
        async with file_service.lock_file(test_file):
            current = test_file.read_text()
            await asyncio.sleep(0.1)  # 模擬處理時間
            test_file.write_text(current + content)

    # 並發寫入
    await asyncio.gather(
        write_to_file(' A'),
        write_to_file(' B'),
        write_to_file(' C')
    )

    # 最終內容應包含所有寫入 (順序可能不同)
    final_content = test_file.read_text()
    assert 'A' in final_content
    assert 'B' in final_content
    assert 'C' in final_content

    # 不應有內容遺失
    assert len(final_content) == len('initial content ABC')
```

**相關任務:**
- Task-003 (File Upload)
- Task-015 (Video Rendering)

**優先級:** 中 (避免資料損壞)

---

### 三、測試覆蓋率分析

#### 各資料流測試覆蓋率估算

| 資料流 | 單元測試 | 整合測試 | E2E 測試 | 總覆蓋率 | 評級 |
|--------|----------|----------|----------|----------|------|
| **專案 CRUD** | 70% | 50% | 80% | 67% | C+ |
| **腳本生成 (Gemini)** | 80% | 40% | 70% | 63% | C |
| **圖片生成 (Stability AI)** | 75% | 30% | 60% | 55% | D+ |
| **影片生成 (D-ID)** | 70% | 35% | 65% | 57% | D+ |
| **批次處理** | 85% | 60% | 75% | 73% | B- |
| **影片渲染 (FFmpeg)** | 65% | 45% | 70% | 60% | C- |
| **YouTube 上傳** | 80% | 50% | 75% | 68% | C+ |
| **WebSocket 推送** | 60% | 40% | 85% | 62% | C |
| **前端 UI** | 75% | 55% | 90% | 73% | B- |

**目標覆蓋率:**
- 一般程式碼: > 80%
- 核心業務邏輯: > 90%

**結論:**
- ✅ 達標流程: 批次處理 (73%)、前端 UI (73%)
- ⚠️ 接近達標: 專案 CRUD (67%)、YouTube 上傳 (68%)
- ❌ 需改善: 圖片生成 (55%)、影片生成 (57%)、影片渲染 (60%)

---

## 影響評估

### 影響範圍
- **功能:** Phase 1 全部 30 個任務
- **用戶:** 開發者 (影響開發品質和維護成本)
- **頻率:** 每次執行測試和部署時

### 嚴重程度
- [x] 設計缺陷 (影響 TDD 品質保證)
- [x] 影響開發效率 (測試不足可能導致 bug 難以發現)
- [x] 影響系統穩定性 (關鍵場景未測試)

---

## 根因分析

### 根本原因
**原因分類:**
- [x] Task 文件撰寫時對測試場景思考不夠全面
- [x] 缺少測試規劃的 Review 流程
- [x] 部分邊界情況和整合場景容易被忽略

### 為什麼會有這些問題

1. **測試案例設計不夠全面:** 主要覆蓋正常流程,忽略邊界和異常情況
2. **整合測試思考不足:** 各 task 獨立規劃,缺少跨系統整合視角
3. **效能測試經驗缺乏:** 音訊同步精度、預覽更新速度等效能要求未轉化為測試

---

## 解決方案

### 優先修正清單

#### 高優先級 (必須在開發前修正)

1. ✅ **Task-015 音訊同步精度測試** - 核心功能要求
2. ✅ **Celery-WebSocket 整合測試** - 影響使用者體驗
3. ✅ **Task-004 並發更新測試** - 資料一致性關鍵
4. ✅ **Task-009 批次部分失敗處理** - 影響批次任務可靠性

#### 中優先級 (Phase 1 完成前修正)

5. **第三方 API 失敗恢復測試** - 提升系統穩定性
6. **Task-022 即時預覽效能測試** - 影響使用者體驗
7. **Task-024 WebSocket 訊息恢復測試** - 確保進度正確性
8. **檔案系統錯誤處理測試** - 避免資料損壞

#### 低優先級 (Phase 2 可改善)

9. **Task-001 跨平台測試** - 如果只部署單一平台可延後
10. **Task-029 跨流程整合測試** - 可在後續階段補充

---

## 實作計劃

### 第 1 步: 更新個別 Task 文件 (預估 2 小時)

逐一修改以下 task 文件,加入建議的新測試:

- [x] `development/phase-1/task-001.md` - 新增測試 6, 7
- [x] `development/phase-1/task-004.md` - 新增測試 8, 9
- [x] `development/phase-1/task-009.md` - 新增測試 8, 9
- [x] `development/phase-1/task-015.md` - 新增測試 11, 12, 13
- [x] `development/phase-1/task-022.md` - 新增測試 14, 15
- [x] `development/phase-1/task-024.md` - 新增測試 16, 17
- [x] `development/phase-1/task-029.md` - 新增測試 11, 12

### 第 2 步: 建立整合測試文件 (預估 1 小時)

在適當的 task 中加入整合測試規劃:

- [x] Celery-WebSocket 整合測試 → 加入 Task-024
- [x] 第三方 API 失敗恢復測試 → 加入 Task-006, 007, 008, 010
- [x] 檔案系統錯誤處理測試 → 加入 Task-003, 015

### 第 3 步: 驗證測試覆蓋率 (預估 30 分鐘)

- [x] 確認所有高優先級測試已加入
- [x] 確認測試覆蓋正常、異常、邊界三種情況
- [x] 確認整合測試涵蓋跨系統場景

---

## 預防措施

### 如何避免類似問題

1. **建立測試案例 Checklist:**
   - 正常流程測試
   - 異常情況測試 (API 失敗、網路錯誤等)
   - 邊界測試 (並發、分頁、極限值等)
   - 效能測試 (回應時間、同步精度等)
   - 整合測試 (跨系統、跨模組)

2. **Test Review 流程:**
   - 每個 task 完成後,由另一人 review 測試規劃
   - 特別關注關鍵路徑和高風險功能

3. **參考測試金字塔:**
   - 單元測試 70%
   - 整合測試 20%
   - E2E 測試 10%

---

## 相關資源

### 需更新的文件

- `development/phase-1/task-001.md`
- `development/phase-1/task-004.md`
- `development/phase-1/task-009.md`
- `development/phase-1/task-015.md`
- `development/phase-1/task-022.md`
- `development/phase-1/task-024.md`
- `development/phase-1/task-029.md`

### 參考文件

- `tech-specs/framework.md` - 測試策略
- `development/phase-1/overview.md` - 任務總覽

---

## 檢查清單

在開始開發前,請確認:

- [ ] 所有高優先級測試已新增到對應 task 文件
- [ ] 整合測試已規劃並包含在測試套件中
- [ ] 測試覆蓋率目標已明確 (80%+ 整體, 90%+ 核心邏輯)
- [ ] 開發團隊已理解 TDD 流程和測試要求

---

## 狀態更新記錄

| 日期 | 狀態 | 說明 |
|------|------|------|
| 2025-10-20 | 🔴 Open | 問題建立,待修正 task 文件 |

---

最後更新: 2025-10-20
