#!/usr/bin/env python3
"""
API 契約檢查工具
自動檢查前後端 API 欄位是否匹配
"""
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass

@dataclass
class APIEndpoint:
    """API endpoint 資訊"""
    method: str
    path: str
    frontend_fields: Set[str]
    backend_fields: Set[str]
    frontend_file: str
    backend_file: str

class APIContractChecker:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.frontend_dir = project_root / "frontend" / "src"
        self.backend_dir = project_root / "backend" / "app"
        self.issues = []

    def extract_typescript_interfaces(self, file_path: Path) -> Dict[str, Set[str]]:
        """從 TypeScript 檔案提取 interface 欄位"""
        interfaces = {}
        content = file_path.read_text()

        # 匹配 interface 定義
        interface_pattern = r'interface\s+(\w+)\s*{([^}]+)}'
        for match in re.finditer(interface_pattern, content, re.MULTILINE):
            interface_name = match.group(1)
            interface_body = match.group(2)

            # 提取欄位名稱
            field_pattern = r'^\s*(\w+)[?:]'
            fields = set()
            for line in interface_body.split('\n'):
                field_match = re.match(field_pattern, line.strip())
                if field_match:
                    fields.add(field_match.group(1))

            interfaces[interface_name] = fields

        return interfaces

    def extract_pydantic_schemas(self, file_path: Path) -> Dict[str, Set[str]]:
        """從 Pydantic schema 提取欄位"""
        schemas = {}
        content = file_path.read_text()

        # 匹配 class 定義
        class_pattern = r'class\s+(\w+)\(BaseModel\):.*?\n((?:    .*\n)*)'
        for match in re.finditer(class_pattern, content, re.MULTILINE):
            class_name = match.group(1)
            class_body = match.group(2)

            # 提取欄位名稱（排除方法和註解）
            field_pattern = r'^\s+(\w+):\s*(?:Mapped\[)?'
            fields = set()
            for line in class_body.split('\n'):
                if line.strip().startswith('def ') or line.strip().startswith('@'):
                    continue
                field_match = re.match(field_pattern, line)
                if field_match:
                    field_name = field_match.group(1)
                    if not field_name.startswith('_'):
                        fields.add(field_name)

            schemas[class_name] = fields

        return schemas

    def find_api_calls(self) -> List[Tuple[str, str, str]]:
        """找出所有前端 API 呼叫"""
        api_calls = []

        # 搜尋前端 API 相關檔案
        api_files = [
            self.frontend_dir / "services" / "api" / "projects.ts",
            self.frontend_dir / "lib" / "api" / "projects.ts",
        ]

        for api_file in api_files:
            if not api_file.exists():
                continue

            content = api_file.read_text()

            # 提取 API 呼叫
            # 匹配 axios.post/get/put/delete
            call_pattern = r'(axios|apiClient|axiosInstance)\.(post|get|put|delete|patch)\([\'"]([^\'"]+)[\'"]'
            for match in re.finditer(call_pattern, content):
                method = match.group(2).upper()
                path = match.group(3)
                api_calls.append((method, path, str(api_file)))

        return api_calls

    def check_schema_match(self, api_name: str, frontend_name: str, backend_name: str,
                          frontend_interfaces: Dict, backend_schemas: Dict):
        """檢查單一 schema 是否匹配"""
        if frontend_name not in frontend_interfaces or backend_name not in backend_schemas:
            return

        frontend_fields = frontend_interfaces[frontend_name]
        backend_fields = backend_schemas[backend_name]

        missing_in_backend = frontend_fields - backend_fields
        missing_in_frontend = backend_fields - frontend_fields

        if missing_in_backend or missing_in_frontend:
            issue = {
                "api": api_name,
                "type": "Field Mismatch",
                "severity": "P0",
                "frontend_schema": frontend_name,
                "backend_schema": backend_name,
                "frontend_fields": sorted(frontend_fields),
                "backend_fields": sorted(backend_fields),
                "missing_in_backend": sorted(missing_in_backend),
                "missing_in_frontend": sorted(missing_in_frontend),
            }
            self.issues.append(issue)

            print(f"  ❌ {frontend_name} vs {backend_name} 不匹配:")
            print(f"     前端欄位: {sorted(frontend_fields)}")
            print(f"     後端欄位: {sorted(backend_fields)}")
            if missing_in_backend:
                print(f"     ⚠️  後端缺少: {sorted(missing_in_backend)}")
            if missing_in_frontend:
                print(f"     ⚠️  前端缺少: {sorted(missing_in_frontend)}")
        else:
            print(f"  ✅ {frontend_name} 欄位匹配")

    def check_projects_api(self):
        """檢查 Projects API"""
        print("\n🔍 檢查 Projects API...")

        # 讀取前端 interface (嘗試兩個可能的路徑)
        frontend_api_paths = [
            self.frontend_dir / "services" / "api" / "projects.ts",
            self.frontend_dir / "lib" / "api" / "projects.ts",
        ]

        frontend_interfaces = {}
        for path in frontend_api_paths:
            if path.exists():
                frontend_interfaces = self.extract_typescript_interfaces(path)
                break

        # 讀取後端 schema
        backend_schema = self.backend_dir / "schemas" / "project.py"
        backend_schemas = {}
        if backend_schema.exists():
            backend_schemas = self.extract_pydantic_schemas(backend_schema)

        # 檢查各個 API
        self.check_schema_match("POST /api/v1/projects",
                               "CreateProjectRequest", "ProjectCreate",
                               frontend_interfaces, backend_schemas)

        self.check_schema_match("PUT /api/v1/projects/{id}/prompt-model",
                               "PromptModelSettings", "PromptModelUpdate",
                               frontend_interfaces, backend_schemas)

        self.check_schema_match("PUT /api/v1/projects/{id}/youtube-settings",
                               "YouTubeSettings", "YouTubeSettingsUpdate",
                               frontend_interfaces, backend_schemas)

    def check_all_apis(self):
        """檢查所有 API"""
        print("\n" + "="*60)
        print("🔍 API 契約自動檢查工具")
        print("="*60)

        # 檢查各個 API
        self.check_projects_api()
        # 可以加入更多 API 檢查...

        return self.issues

    def generate_report(self):
        """產生問題報告"""
        print("\n" + "="*60)
        print("📊 檢查結果摘要")
        print("="*60)

        if not self.issues:
            print("\n✅ 所有 API 契約檢查通過！")
            return

        print(f"\n❌ 發現 {len(self.issues)} 個問題：\n")

        for i, issue in enumerate(self.issues, 1):
            print(f"{i}. {issue['api']}")
            print(f"   類型: {issue['type']}")
            print(f"   嚴重程度: {issue['severity']}")
            print(f"   前端欄位: {issue['frontend_fields']}")
            print(f"   後端欄位: {issue['backend_fields']}")

            if issue['missing_in_backend']:
                print(f"   ⚠️  後端需要新增: {issue['missing_in_backend']}")
            if issue['missing_in_frontend']:
                print(f"   ⚠️  前端需要新增: {issue['missing_in_frontend']}")
            print()

        # 儲存為 JSON
        report_path = self.project_root / "api-contract-issues.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.issues, f, indent=2, ensure_ascii=False)

        print(f"📄 詳細報告已儲存至: {report_path}")


def main():
    project_root = Path(__file__).parent.parent
    checker = APIContractChecker(project_root)

    issues = checker.check_all_apis()
    checker.generate_report()

    # 返回錯誤碼
    return 1 if issues else 0


if __name__ == "__main__":
    exit(main())
