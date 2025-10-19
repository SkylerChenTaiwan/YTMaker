# 效能優化

> **關聯文件:** [caching.md](./caching.md), [database.md](./database.md)

---

## 1. 資料庫查詢優化

### Eager Loading

**避免 N+1 查詢:**

```python
from sqlalchemy.orm import joinedload

# ❌ 壞的做法 (N+1 查詢)
projects = db.query(Project).all()
for project in projects:
    print(project.configuration.name)  # 每次都查詢一次

# ✅ 好的做法 (Eager Loading)
projects = db.query(Project).options(
    joinedload(Project.configuration),
    joinedload(Project.script)
).all()

for project in projects:
    print(project.configuration.name)  # 不會額外查詢
```

---

## 2. 非同步處理

### 使用 async/await

```python
@router.get("/projects")
async def list_projects(db: Session = Depends(get_db)):
    """非同步查詢專案列表"""
    projects = await db.execute(
        select(Project).options(joinedload(Project.configuration))
    )
    return projects.scalars().all()
```

---

## 3. 連線池

### SQLAlchemy 連線池配置

```python
from sqlalchemy import create_engine

engine = create_engine(
    DATABASE_URL,
    pool_size=10,  # 連線池大小
    max_overflow=20,  # 最大溢出連線
    pool_pre_ping=True  # 檢查連線有效性
)
```

---

## 4. 批次處理

### 批次插入

```python
# ✅ 批次插入效能更好
assets = [
    Asset(project_id=project_id, asset_type="image", file_path=path)
    for path in image_paths
]

db.bulk_save_objects(assets)
db.commit()
```

---

## 總結

### 優化策略
- ✅ Eager Loading 避免 N+1
- ✅ 非同步處理提升效能
- ✅ 連線池管理
- ✅ 批次處理
