from typing import Any


class PromptTemplateEngine:
    """
    Prompt 模板引擎

    支援簡單的變數替換：{variable_name}
    """

    def render(self, template: str, variables: dict[str, Any]) -> str:
        """
        渲染模板（變數替換）

        Args:
            template: 模板字串（包含 {variable_name}）
            variables: 變數字典

        Returns:
            渲染後的字串

        Example:
            >>> template = "請根據以下內容生成腳本：\\n{content}\\n每段時長 {min_duration}-{max_duration} 秒"
            >>> variables = {"content": "...", "min_duration": 5, "max_duration": 20}
            >>> engine.render(template, variables)
            "請根據以下內容生成腳本：\\n...\\n每段時長 5-20 秒"
        """
        result = template

        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            result = result.replace(placeholder, str(value))

        return result
