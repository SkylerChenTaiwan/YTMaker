from fastapi import APIRouter, HTTPException, status

from app.integrations.gemini_client import GeminiAPIError, GeminiClient
from app.security.keychain import KeychainManager

router = APIRouter(prefix="/gemini", tags=["gemini"])


@router.get("/models")
async def list_gemini_models():
    """
    列出所有可用的 Gemini 模型

    需要先在系統設定中配置 Gemini API Key

    回傳：
    - models: 模型列表，包含 name, display_name, description

    範例回應：
    {
        "success": true,
        "data": {
            "models": [
                {
                    "name": "models/gemini-2.5-flash",
                    "display_name": "Gemini 2.5 Flash",
                    "description": "Fast and versatile model...",
                    "supported_generation_methods": ["generateContent"]
                }
            ]
        }
    }
    """
    # 1. 從 Keychain 取得 Gemini API Key
    keychain = KeychainManager()
    api_key = keychain.get_api_key("gemini")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API Key 尚未配置，請先在系統設定中設定",
        )

    # 2. 調用 GeminiClient.list_models()
    try:
        models = GeminiClient.list_models(api_key=api_key)
        return {"success": True, "data": {"models": models}}

    except GeminiAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
