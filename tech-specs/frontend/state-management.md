# 狀態管理

> **參考原始文件:** frontend-spec.md 第 395-565 行
> **關聯文件:** [overview.md](./overview.md), [api-integration.md](./api-integration.md)

本文件定義了全域狀態設計、本地狀態管理、狀態更新流程、持久化策略與同步機制。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 3.1 全域狀態設計 (第 397-446 行)
- 3.2 本地狀態管理 (第 450-469 行)
- 3.3 狀態更新流程 (第 473-491 行)
- 3.4 狀態持久化策略 (第 495-528 行)
- 3.5 狀態同步機制 (第 532-563 行)

---

## 全域 Zustand Stores

### useProjectStore

```typescript
interface ProjectStore {
  currentProject: Project | null
  projects: Project[]
  setCurrentProject: (project: Project) => void
  fetchProjects: () => Promise<void>
  deleteProject: (id: string) => Promise<void>
}
```

### useConfigStore

```typescript
interface ConfigStore {
  visualConfig: VisualConfig | null
  promptTemplate: string
  geminiModel: string
  updateVisualConfig: (config: Partial<VisualConfig>) => void
}
```

### useProgressStore

```typescript
interface ProgressStore {
  progress: number  // 0-100
  currentStage: string
  logs: string[]
  addLog: (log: string) => void
  updateProgress: (progress: number, stage: string) => void
}
```

---

## WebSocket 即時同步

```typescript
// hooks/useProgressSync.ts
export const useProgressSync = (projectId: string) => {
  const { updateProgress, addLog } = useProgressStore()

  useEffect(() => {
    const socket = io(`http://localhost:8000/projects/${projectId}/progress`)

    socket.on('progress', (data) => {
      updateProgress(data.percent, data.stage)
    })

    socket.on('log', (data) => {
      addLog(data.message)
    })

    return () => socket.disconnect()
  }, [projectId])
}
```

---

詳細規格請參考原始文件。
