"""任務狀態管理器 - 支援斷點續傳"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any


class StateManager:
    """任務狀態管理器"""

    def __init__(self, project_id: int):
        self.project_id = project_id
        self.state_file = Path(f"data/projects/{project_id}/project_state.json")
        self.state_file.parent.mkdir(parents=True, exist_ok=True)

    def save_state(self, state: dict[str, Any]):
        """
        儲存任務狀態到檔案

        Args:
            state: 狀態字典
        """
        # 讀取現有狀態
        existing_state = self.load_state() or {}

        # 合併新狀態
        existing_state.update(state)
        existing_state["last_updated"] = datetime.utcnow().isoformat()

        # 寫入檔案
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(existing_state, f, ensure_ascii=False, indent=2)

    def load_state(self) -> dict[str, Any] | None:
        """
        載入任務狀態

        Returns:
            dict: 狀態字典，如果不存在則返回 None
        """
        if not self.state_file.exists():
            return None

        with open(self.state_file, encoding="utf-8") as f:
            return json.load(f)

    def clear_state(self):
        """清除狀態檔案"""
        if self.state_file.exists():
            os.remove(self.state_file)


def recover_interrupted_tasks() -> list[dict[str, Any]]:
    """
    恢復中斷的任務

    掃描所有專案的狀態檔案,找出未完成的任務

    Returns:
        list: 需要恢復的專案列表
    """
    data_dir = Path("data/projects")
    if not data_dir.exists():
        return []

    interrupted_projects = []

    for project_dir in data_dir.iterdir():
        if not project_dir.is_dir():
            continue

        state_file = project_dir / "project_state.json"
        if not state_file.exists():
            continue

        with open(state_file) as f:
            state = json.load(f)

        # 檢查是否為未完成的任務
        if state.get("stage") != "completed":
            project_id = int(project_dir.name)
            interrupted_projects.append(
                {"project_id": project_id, "stage": state.get("stage"), "state": state}
            )

    return interrupted_projects
