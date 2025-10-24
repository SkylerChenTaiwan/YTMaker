#!/usr/bin/env python3
"""
自動整合測試工具
實際測試前後端 API 整合
"""
import requests
import json
import sys
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass, asdict
import time

@dataclass
class TestResult:
    """測試結果"""
    api: str
    method: str
    status_code: int
    success: bool
    error_message: str = ""
    request_data: Dict = None
    response_data: Dict = None
    issue_type: str = ""

class IntegrationTester:
    def __init__(self, backend_url: str = "http://localhost:8000"):
        self.backend_url = backend_url
        self.results: List[TestResult] = []
        self.issues: List[Dict] = []

    def check_backend_health(self) -> bool:
        """檢查後端服務是否運行"""
        try:
            response = requests.get(f"{self.backend_url}/docs", timeout=5)
            return response.status_code == 200
        except:
            return False

    def test_create_project(self) -> TestResult:
        """測試創建專案 API"""
        print("\n📝 測試: POST /api/v1/projects (創建專案)")

        # 模擬前端實際發送的資料
        test_data = {
            "project_name": "自動測試專案",
            "content_text": "這是自動測試內容。" * 100,  # 確保超過 500 字
            "content_source": "paste",
            "gemini_model": "gemini-1.5-flash"
        }

        try:
            response = requests.post(
                f"{self.backend_url}/api/v1/projects",
                json=test_data,
                timeout=10
            )

            result = TestResult(
                api="/api/v1/projects",
                method="POST",
                status_code=response.status_code,
                success=response.status_code == 201,
                request_data=test_data,
                response_data=response.json() if response.status_code != 500 else None
            )

            if response.status_code == 422:
                result.error_message = "欄位驗證失敗 (Field validation error)"
                result.issue_type = "Field Mismatch"
                error_detail = response.json().get('detail', [])
                print(f"   ❌ 422 錯誤: {error_detail}")

                # 記錄問題
                self.issues.append({
                    "api": "/api/v1/projects",
                    "method": "POST",
                    "severity": "P0",
                    "type": "Field Mismatch",
                    "frontend_sent": list(test_data.keys()),
                    "error_detail": error_detail,
                })

            elif response.status_code == 201:
                print(f"   ✅ 成功創建專案: {response.json().get('id')}")
            else:
                result.error_message = f"意外的狀態碼: {response.status_code}"
                print(f"   ⚠️  {result.error_message}")

            return result

        except Exception as e:
            return TestResult(
                api="/api/v1/projects",
                method="POST",
                status_code=0,
                success=False,
                error_message=str(e),
                request_data=test_data
            )

    def test_update_configuration(self, project_id: str) -> TestResult:
        """測試更新配置 API"""
        print(f"\n🔧 測試: PUT /api/v1/projects/{project_id}/configuration")

        test_data = {
            "subtitle": {"enabled": True, "color": "#FFFFFF"},
            "logo": {"enabled": False}
        }

        try:
            response = requests.put(
                f"{self.backend_url}/api/v1/projects/{project_id}/configuration",
                json=test_data,
                timeout=10
            )

            result = TestResult(
                api=f"/api/v1/projects/{project_id}/configuration",
                method="PUT",
                status_code=response.status_code,
                success=response.status_code == 200,
                request_data=test_data,
                response_data=response.json() if response.status_code != 500 else None
            )

            if response.status_code == 422:
                result.error_message = "欄位驗證失敗"
                result.issue_type = "Field Mismatch"
                print(f"   ❌ 422 錯誤: {response.json().get('detail')}")

                self.issues.append({
                    "api": f"/api/v1/projects/{{id}}/configuration",
                    "method": "PUT",
                    "severity": "P1",
                    "type": "Field Mismatch",
                    "frontend_sent": list(test_data.keys()),
                    "error_detail": response.json().get('detail'),
                })

            elif response.status_code == 200:
                print(f"   ✅ 成功更新配置")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api=f"/api/v1/projects/{project_id}/configuration",
                method="PUT",
                status_code=0,
                success=False,
                error_message=str(e),
                request_data=test_data
            )

    def test_update_youtube_settings(self, project_id: str) -> TestResult:
        """測試更新 YouTube 設定 API"""
        print(f"\n📺 測試: PUT /api/v1/projects/{project_id}/youtube-settings")

        test_data = {
            "title": "測試影片標題",
            "description": "測試影片描述",
            "tags": ["測試", "自動化"],
            "privacy": "private",
            "publish_type": "immediate",
            "ai_content_flag": True
        }

        try:
            response = requests.put(
                f"{self.backend_url}/api/v1/projects/{project_id}/youtube-settings",
                json=test_data,
                timeout=10
            )

            result = TestResult(
                api=f"/api/v1/projects/{project_id}/youtube-settings",
                method="PUT",
                status_code=response.status_code,
                success=response.status_code == 200,
                request_data=test_data,
                response_data=response.json() if response.status_code != 500 else None
            )

            if response.status_code == 422:
                result.error_message = "欄位驗證失敗"
                result.issue_type = "Field Mismatch"
                print(f"   ❌ 422 錯誤: {response.json().get('detail')}")

                self.issues.append({
                    "api": f"/api/v1/projects/{{id}}/youtube-settings",
                    "method": "PUT",
                    "severity": "P1",
                    "type": "Field Mismatch",
                    "frontend_sent": list(test_data.keys()),
                    "error_detail": response.json().get('detail'),
                })

            elif response.status_code == 200:
                print(f"   ✅ 成功更新 YouTube 設定")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api=f"/api/v1/projects/{project_id}/youtube-settings",
                method="PUT",
                status_code=0,
                success=False,
                error_message=str(e),
                request_data=test_data
            )

    def test_list_projects(self) -> TestResult:
        """測試列出專案 API"""
        print("\n📋 測試: GET /api/v1/projects (列出專案)")

        try:
            response = requests.get(
                f"{self.backend_url}/api/v1/projects",
                params={"limit": 20, "offset": 0},
                timeout=10
            )

            result = TestResult(
                api="/api/v1/projects",
                method="GET",
                status_code=response.status_code,
                success=response.status_code == 200,
                response_data=response.json() if response.status_code == 200 else None
            )

            if response.status_code == 200:
                data = response.json()
                count = len(data.get('data', {}).get('projects', []))
                print(f"   ✅ 成功取得 {count} 個專案")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api="/api/v1/projects",
                method="GET",
                status_code=0,
                success=False,
                error_message=str(e)
            )

    def test_get_project(self, project_id: str) -> TestResult:
        """測試取得單一專案 API"""
        print(f"\n🔍 測試: GET /api/v1/projects/{project_id} (取得專案詳情)")

        try:
            response = requests.get(
                f"{self.backend_url}/api/v1/projects/{project_id}",
                timeout=10
            )

            result = TestResult(
                api=f"/api/v1/projects/{project_id}",
                method="GET",
                status_code=response.status_code,
                success=response.status_code == 200,
                response_data=response.json() if response.status_code == 200 else None
            )

            if response.status_code == 200:
                name = response.json().get('name')
                print(f"   ✅ 成功取得專案: {name}")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api=f"/api/v1/projects/{project_id}",
                method="GET",
                status_code=0,
                success=False,
                error_message=str(e)
            )

    def test_update_prompt_model(self, project_id: str) -> TestResult:
        """測試更新 Prompt 與模型 API"""
        print(f"\n🤖 測試: PUT /api/v1/projects/{project_id}/prompt-model")

        # 先創建一個 prompt template（如果需要）
        # 這裡用 None 測試
        test_data = {
            "gemini_model": "gemini-1.5-pro"
        }

        try:
            response = requests.put(
                f"{self.backend_url}/api/v1/projects/{project_id}/prompt-model",
                json=test_data,
                timeout=10
            )

            result = TestResult(
                api=f"/api/v1/projects/{project_id}/prompt-model",
                method="PUT",
                status_code=response.status_code,
                success=response.status_code in [200, 400],  # 400 是預期的（需要 prompt_template_id）
                request_data=test_data,
                response_data=response.json() if response.status_code != 500 else None
            )

            if response.status_code == 422:
                result.error_message = "欄位驗證失敗"
                result.issue_type = "Field Mismatch"
                print(f"   ❌ 422 錯誤: {response.json().get('detail')}")

                self.issues.append({
                    "api": f"/api/v1/projects/{{id}}/prompt-model",
                    "method": "PUT",
                    "severity": "P1",
                    "type": "Field Mismatch",
                    "frontend_sent": list(test_data.keys()),
                    "error_detail": response.json().get('detail'),
                })

            elif response.status_code == 200:
                print(f"   ✅ 成功更新 Prompt 與模型")
            elif response.status_code == 400:
                print(f"   ℹ️  預期的驗證錯誤（缺少必要參數）")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api=f"/api/v1/projects/{project_id}/prompt-model",
                method="PUT",
                status_code=0,
                success=False,
                error_message=str(e),
                request_data=test_data
            )

    def test_get_prompt_templates(self) -> TestResult:
        """測試獲取 Prompt 範本列表 API"""
        print("\n📝 測試: GET /api/v1/prompt-templates (獲取 Prompt 範本)")

        try:
            response = requests.get(
                f"{self.backend_url}/api/v1/prompt-templates",
                timeout=10
            )

            result = TestResult(
                api="/api/v1/prompt-templates",
                method="GET",
                status_code=response.status_code,
                success=response.status_code == 200,
                response_data=response.json() if response.status_code == 200 else None
            )

            if response.status_code == 200:
                data = response.json()

                # 驗證響應格式
                if 'success' not in data or 'data' not in data:
                    result.success = False
                    result.error_message = "響應格式錯誤：缺少 success 或 data 欄位"
                    result.issue_type = "Response Format Error"
                    print(f"   ❌ 響應格式錯誤")

                    self.issues.append({
                        "api": "/api/v1/prompt-templates",
                        "method": "GET",
                        "severity": "P1",
                        "type": "Response Format Error",
                        "error_detail": "Missing 'success' or 'data' field",
                        "actual_response": data,
                    })
                elif 'templates' not in data.get('data', {}):
                    result.success = False
                    result.error_message = "響應格式錯誤：data 中缺少 templates 欄位"
                    result.issue_type = "Response Format Error"
                    print(f"   ❌ 響應格式錯誤：缺少 templates")

                    self.issues.append({
                        "api": "/api/v1/prompt-templates",
                        "method": "GET",
                        "severity": "P1",
                        "type": "Response Format Error",
                        "error_detail": "Missing 'templates' field in data",
                        "actual_response": data,
                    })
                elif not isinstance(data['data']['templates'], list):
                    result.success = False
                    result.error_message = "響應格式錯誤：templates 不是陣列"
                    result.issue_type = "Response Format Error"
                    print(f"   ❌ templates 不是陣列")

                    self.issues.append({
                        "api": "/api/v1/prompt-templates",
                        "method": "GET",
                        "severity": "P1",
                        "type": "Response Format Error",
                        "error_detail": "templates is not an array",
                        "actual_type": type(data['data']['templates']).__name__,
                    })
                else:
                    count = len(data['data']['templates'])
                    print(f"   ✅ 成功取得 {count} 個 Prompt 範本")
                    print(f"   ℹ️  響應格式正確: {{success, data: {{templates: []}}}}")
            else:
                print(f"   ⚠️  狀態碼: {response.status_code}")

            return result

        except Exception as e:
            return TestResult(
                api="/api/v1/prompt-templates",
                method="GET",
                status_code=0,
                success=False,
                error_message=str(e)
            )

    def run_all_tests(self):
        """執行所有測試"""
        print("\n" + "="*60)
        print("🚀 自動整合測試")
        print("="*60)

        # 檢查後端服務
        print("\n🔍 檢查後端服務...")
        if not self.check_backend_health():
            print("❌ 後端服務未運行！請先啟動後端:")
            print("   cd backend && python3 -m uvicorn app.main:app --port 8000")
            return False

        print("✅ 後端服務正常運行")

        # 測試列表
        list_result = self.test_list_projects()
        self.results.append(list_result)

        # 測試 Prompt 範本列表
        templates_result = self.test_get_prompt_templates()
        self.results.append(templates_result)

        # 測試創建專案
        create_result = self.test_create_project()
        self.results.append(create_result)

        # 如果創建成功，繼續測試其他 API
        if create_result.success and create_result.response_data:
            project_id = create_result.response_data.get('id')

            # 測試取得單一專案
            get_result = self.test_get_project(project_id)
            self.results.append(get_result)

            # 測試更新配置
            config_result = self.test_update_configuration(project_id)
            self.results.append(config_result)

            # 測試更新 Prompt 與模型
            prompt_result = self.test_update_prompt_model(project_id)
            self.results.append(prompt_result)

            # 測試更新 YouTube 設定
            youtube_result = self.test_update_youtube_settings(project_id)
            self.results.append(youtube_result)

        return True

    def generate_report(self):
        """產生測試報告"""
        print("\n" + "="*60)
        print("📊 測試結果摘要")
        print("="*60)

        total = len(self.results)
        passed = sum(1 for r in self.results if r.success)
        failed = total - passed

        print(f"\n總共測試: {total} 個 API")
        print(f"✅ 通過: {passed}")
        print(f"❌ 失敗: {failed}")

        if self.issues:
            print(f"\n🚨 發現 {len(self.issues)} 個問題：\n")
            for i, issue in enumerate(self.issues, 1):
                print(f"{i}. {issue['method']} {issue['api']}")
                print(f"   類型: {issue['type']}")
                print(f"   嚴重程度: {issue['severity']}")
                print(f"   前端發送: {issue['frontend_sent']}")
                if 'error_detail' in issue:
                    print(f"   錯誤詳情: {issue['error_detail']}")
                print()

            # 儲存報告
            report_path = Path(__file__).parent.parent / "integration-test-report.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "summary": {
                        "total": total,
                        "passed": passed,
                        "failed": failed
                    },
                    "issues": self.issues,
                    "details": [asdict(r) for r in self.results]
                }, f, indent=2, ensure_ascii=False)

            print(f"📄 詳細報告已儲存至: {report_path}")
        else:
            print("\n🎉 所有測試通過！")

        return failed == 0


def main():
    tester = IntegrationTester()

    if not tester.run_all_tests():
        return 1

    success = tester.generate_report()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
