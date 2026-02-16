"""CR (Creative Brief) generation service using Claude API."""

import anthropic

from app.config import settings


async def generate_cr(
    product_name: str,
    purpose: str,
    duration: str,
    tone: str | None = None,
    additional_instructions: str | None = None,
    reference_videos: list[str] | None = None,
    knowledge_context: str | None = None,
) -> dict:
    """Generate creative brief using Claude API.

    Returns a structured dict with:
    - concept: 構成案 (video structure outline)
    - script: 台本 (full video script)
    - hooks: フック案 (3 hook options for the first 3 seconds)
    - cta: CTA文言
    - notes: 制作メモ
    """
    system_prompt = """あなたはTikTok Shopの縦型動画クリエイティブ制作の専門家です。
セラーが提供する商品情報を基に、売れる動画の構成案・台本・フックを生成してください。

出力はJSON形式で以下の構造にしてください:
{
  "concept": "構成案（動画全体の流れを箇条書き）",
  "script": "台本（ナレーション・テロップ・映像指示を含む完全な台本）",
  "hooks": ["フック案1（最初の3秒）", "フック案2", "フック案3"],
  "cta": "CTA文言（購入を促す一言）",
  "notes": "制作上の注意点・コツ"
}"""

    user_message_parts = [
        f"## 商品名\n{product_name}",
        f"## 目的\n{purpose}",
        f"## 動画尺\n{duration}",
    ]

    if tone:
        user_message_parts.append(f"## トーン\n{tone}")
    if additional_instructions:
        user_message_parts.append(f"## 追加指示\n{additional_instructions}")
    if reference_videos:
        user_message_parts.append(f"## 参考動画URL\n" + "\n".join(reference_videos))
    if knowledge_context:
        user_message_parts.append(f"## 参考ナレッジ（過去の成功パターン）\n{knowledge_context}")

    user_message = "\n\n".join(user_message_parts)

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    response = await client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )

    # Parse JSON from response
    import json

    content = response.content[0].text

    # Try to extract JSON from the response
    try:
        # Handle cases where Claude wraps JSON in markdown code blocks
        if "```json" in content:
            json_str = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            json_str = content.split("```")[1].split("```")[0].strip()
        else:
            json_str = content.strip()

        return json.loads(json_str)
    except (json.JSONDecodeError, IndexError):
        # If JSON parsing fails, return raw text in structured format
        return {
            "concept": content,
            "script": "",
            "hooks": [],
            "cta": "",
            "notes": "AI出力のJSON解析に失敗。上記のconceptにraw出力を格納。",
        }
