#!/usr/bin/env python3
"""
API 契約自動檢查工具 - 完全自動化版本
自動掃描所有前後端 API 並檢查是否匹配
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
        interface_pattern = r'export\s+interface\s+(\w+)\s*{([^}]+)}'
        for match in re.finditer(interface_pattern, content, re.MULTILINE | re.DOTALL):
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

        # 匹配 class 定義 - 更寬鬆的匹配
        class_pattern = r'class\s+(\w+)\(BaseModel\):[^\n]*\n((?:(?:    |\t).*\n)*)'
        for match in re.finditer(class_pattern, content, re.MULTILINE):
            class_name = match.group(1)
            class_body = match.group(2)

            # 提取欄位名稱
            field_pattern = r'^\s+(\w+):\s*'
            fields = set()
            for line in class_body.split('\n'):
                line_stripped = line.strip()
                # 跳過空行、註解、方法、裝飾器、model_config
                if (not line_stripped or
                    line_stripped.startswith('#') or
                    line_stripped.startswith('def ') or
                    line_stripped.startswith('@') or
                    line_stripped.startswith('model_config') or
                    line_stripped.startswith('"""') or
                    line_stripped.startswith("'''")):
                    continue

                field_match = re.match(field_pattern, line)
                if field_match:
                    field_name = field_match.group(1)
                    if not field_name.startswith('_'):
                        fields.add(field_name)

            if fields:  # 只添加有欄位的 schema
                schemas[class_name] = fields

        return schemas

    def extract_api_calls_with_schemas(self, file_path: Path) -> List[Dict]:
        """提取前端 API 呼叫及其使用的 schema"""
        api_calls = []
        content = file_path.read_text()

        # 匹配函數定義及其內部的 API 呼叫
        # 匹配: export async function functionName(param: Type, data: DataType): Promise<ReturnType>
        function_pattern = r'export\s+async\s+function\s+(\w+)\s*\([^)]*data:\s*(\w+)[^)]*\)[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}'

        for match in re.finditer(function_pattern, content, re.MULTILINE | re.DOTALL):
            function_name = match.group(1)
            data_type = match.group(2)
            function_body = match.group(3)

            # 在函數體中查找 API 呼叫
            call_pattern = r'(axios|apiClient|axiosInstance)\.(post|get|put|delete|patch)\s*\(\s*[\'"`]([^\'"`:]+)[\'"`]'
            for call_match in re.finditer(call_pattern, function_body):
                method = call_match.group(2).upper()
                path = call_match.group(3)

                # 移除變數插值，保留路徑結構
                path = re.sub(r'\$\{[^}]+\}', '{id}', path)

                api_calls.append({
                    'method': method,
                    'path': path,
                    'function': function_name,
                    'schema': data_type,
                    'file': str(file_path)
                })

        return api_calls

    def extract_backend_routes(self, file_path: Path) -> List[Dict]:
        """提取後端路由及其使用的 schema"""
        routes = []
        content = file_path.read_text()

        # 匹配路由定義
        # @router.method("path", ...)
        # def function_name(data: SchemaType, ...)
        route_pattern = r'@router\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]\s*[^)]*\)[^)]*\n\s*(?:async\s+)?def\s+\w+\s*\([^)]*?(?:data:\s*(\w+))?[^)]*\)'

        for match in re.finditer(route_pattern, content, re.MULTILINE | re.DOTALL):
            method = match.group(1).upper()
            path = match.group(2)
            schema = match.group(3)  # 可能是 None

            routes.append({
                'method': method,
                'path': path,
                'schema': schema,
                'file': str(file_path)
            })

        return routes

    def normalize_path(self, path: str) -> str:
        """標準化路徑格式"""
        # 替換路徑參數為統一格式
        path = re.sub(r'\{[^}]+\}', '{id}', path)
        # 確保以 /api/v1 開頭
        if not path.startswith('/api/v1'):
            path = '/api/v1' + path if path.startswith('/') else '/api/v1/' + path
        return path

    def check_all_apis_automatically(self):
        """自動檢查所有 API"""
        print("\n" + "="*80)
        print("🤖 API 契約自動檢查工具 - 完全自動化")
        print("="*80)

        # 1. 掃描前端 API 檔案
        print("\n📁 掃描前端 API 檔案...")
        frontend_api_files = []
        for pattern in ['lib/api/*.ts', 'services/api/*.ts']:
            frontend_api_files.extend(self.frontend_dir.glob(pattern))

        print(f"   找到 {len(frontend_api_files)} 個前端 API 檔案")

        # 提取所有前端 interface 和 API 呼叫
        all_frontend_interfaces = {}
        all_frontend_calls = []

        for file_path in frontend_api_files:
            interfaces = self.extract_typescript_interfaces(file_path)
            all_frontend_interfaces.update(interfaces)

            calls = self.extract_api_calls_with_schemas(file_path)
            all_frontend_calls.extend(calls)

        print(f"   找到 {len(all_frontend_interfaces)} 個 interface")
        print(f"   找到 {len(all_frontend_calls)} 個 API 呼叫")

        # 2. 掃描後端 schema 檔案
        print("\n📁 掃描後端 Schema 檔案...")
        backend_schema_files = list(self.backend_dir.glob('schemas/*.py'))
        print(f"   找到 {len(backend_schema_files)} 個後端 schema 檔案")

        all_backend_schemas = {}
        for file_path in backend_schema_files:
            schemas = self.extract_pydantic_schemas(file_path)
            all_backend_schemas.update(schemas)

        print(f"   找到 {len(all_backend_schemas)} 個 Pydantic schema")

        # 3. 掃描後端路由檔案
        print("\n📁 掃描後端路由檔案...")
        backend_route_files = list(self.backend_dir.glob('api/**/*.py'))
        print(f"   找到 {len(backend_route_files)} 個後端路由檔案")

        all_backend_routes = []
        for file_path in backend_route_files:
            routes = self.extract_backend_routes(file_path)
            all_backend_routes.extend(routes)

        print(f"   找到 {len(all_backend_routes)} 個後端路由")

        # 4. 匹配前後端 API
        print("\n🔍 開始匹配前後端 API...")

        for frontend_call in all_frontend_calls:
            frontend_path = self.normalize_path(frontend_call['path'])
            frontend_method = frontend_call['method']
            frontend_schema = frontend_call['schema']

            # 查找對應的後端路由
            matched = False
            for backend_route in all_backend_routes:
                backend_path = self.normalize_path(backend_route['path'])
                backend_method = backend_route['method']
                backend_schema = backend_route['schema']

                if frontend_method == backend_method and frontend_path == backend_path:
                    matched = True
                    print(f"\n✓ 找到匹配: {frontend_method} {frontend_path}")
                    print(f"  前端: {frontend_call['function']}() 使用 {frontend_schema}")
                    print(f"  後端: 使用 {backend_schema}")

                    # 檢查 schema 欄位是否匹配
                    if frontend_schema in all_frontend_interfaces and backend_schema and backend_schema in all_backend_schemas:
                        frontend_fields = all_frontend_interfaces[frontend_schema]
                        backend_fields = all_backend_schemas[backend_schema]

                        missing_in_backend = frontend_fields - backend_fields
                        missing_in_frontend = backend_fields - frontend_fields

                        if missing_in_backend or missing_in_frontend:
                            print(f"  ❌ Schema 欄位不匹配!")
                            print(f"     前端欄位 ({frontend_schema}): {sorted(frontend_fields)}")
                            print(f"     後端欄位 ({backend_schema}): {sorted(backend_fields)}")
                            if missing_in_backend:
                                print(f"     ⚠️  後端缺少: {sorted(missing_in_backend)}")
                            if missing_in_frontend:
                                print(f"     ⚠️  前端缺少: {sorted(missing_in_frontend)}")

                            self.issues.append({
                                'api': f"{frontend_method} {frontend_path}",
                                'type': 'Field Mismatch',
                                'severity': 'P0',
                                'frontend_schema': frontend_schema,
                                'backend_schema': backend_schema,
                                'frontend_fields': sorted(frontend_fields),
                                'backend_fields': sorted(backend_fields),
                                'missing_in_backend': sorted(missing_in_backend),
                                'missing_in_frontend': sorted(missing_in_frontend),
                            })
                        else:
                            print(f"  ✅ Schema 欄位完全匹配")
                    break

            if not matched:
                print(f"\n⚠️  前端 API 沒有對應的後端路由:")
                print(f"  {frontend_method} {frontend_path}")
                print(f"  函數: {frontend_call['function']}()")

                self.issues.append({
                    'api': f"{frontend_method} {frontend_path}",
                    'type': 'Missing Backend Route',
                    'severity': 'P1',
                    'frontend_function': frontend_call['function'],
                })

        return self.issues

    def generate_report(self):
        """產生問題報告"""
        print("\n" + "="*80)
        print("📊 檢查結果摘要")
        print("="*80)

        if not self.issues:
            print("\n✅ 所有 API 契約檢查通過！")
            return

        print(f"\n❌ 發現 {len(self.issues)} 個問題：\n")

        for i, issue in enumerate(self.issues, 1):
            print(f"{i}. {issue['api']}")
            print(f"   類型: {issue['type']}")
            print(f"   嚴重程度: {issue['severity']}")

            if issue['type'] == 'Field Mismatch':
                print(f"   前端 Schema: {issue['frontend_schema']}")
                print(f"   後端 Schema: {issue['backend_schema']}")
                print(f"   前端欄位: {issue['frontend_fields']}")
                print(f"   後端欄位: {issue['backend_fields']}")
                if issue['missing_in_backend']:
                    print(f"   ⚠️  後端需要新增: {issue['missing_in_backend']}")
                if issue['missing_in_frontend']:
                    print(f"   ⚠️  前端需要新增: {issue['missing_in_frontend']}")
            elif issue['type'] == 'Missing Backend Route':
                print(f"   前端函數: {issue['frontend_function']}()")

            print()

        # 儲存為 JSON
        report_path = self.project_root / "api-contract-issues.json"
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.issues, f, indent=2, ensure_ascii=False)

        print(f"📄 詳細報告已儲存至: {report_path}")


def main():
    project_root = Path(__file__).parent.parent
    checker = APIContractChecker(project_root)

    issues = checker.check_all_apis_automatically()
    checker.generate_report()

    # 返回錯誤碼
    return 1 if issues else 0


if __name__ == "__main__":
    exit(main())
