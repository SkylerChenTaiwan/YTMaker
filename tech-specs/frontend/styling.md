# 樣式設計

> **參考原始文件:** frontend-spec.md 第 2321-2814 行
> **關聯文件:** [overview.md](./overview.md), [component-architecture.md](./component-architecture.md)

本文件定義了設計哲學、視覺風格、色彩系統、字體系統與 UI 元件風格指南。

完整內容請參考原始 `frontend-spec.md` 文件的以下章節：
- 16.0 設計哲學與視覺風格 (第 2323-2650 行)
- 16.1 CSS 架構 (第 2652-2658 行)
- 16.2 主題系統 (第 2662-2687 行)
- 16.3 設計 Token 定義 (第 2691-2729 行)
- 16.5 動畫與過渡 (第 2757-2781 行)
- 16.6 字體載入策略 (第 2785-2812 行)

---

## 設計哲學

**核心原則:**
1. **極簡主義 (Minimalism)** - 減少視覺噪音
2. **內容為王 (Content-First)** - 突出核心內容
3. **優雅的互動 (Elegant Interactions)** - 微妙的過渡效果
4. **舒適的閱讀體驗** - 合適的行高與對比

---

## 色彩系統

```css
:root {
  --color-primary: #1E88E5;
  --color-text-primary: #37352f;   /* 深灰而非純黑 */
  --color-text-secondary: #787774;
  --color-border: #e9e9e7;         /* 極淺的灰色邊框 */
  --color-background: #ffffff;
  --color-background-hover: #f7f6f3;
}
```

---

## 間距系統

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

---

## 圓角與陰影

```css
/* 圓角 */
--radius-sm: 3px;
--radius-md: 6px;
--radius-lg: 8px;

/* 陰影 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
```

---

## 按鈕設計

```css
.btn-primary {
  background: #1E88E5;
  color: #ffffff;
  border: none;
  border-radius: 3px;
  padding: 6px 12px;
  font-size: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.btn-primary:hover {
  background: #1565C0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
}
```

---

詳細規格請參考原始文件。
