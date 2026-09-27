from __future__ import annotations

import os
import re


class PersonDescriptionUnavailable(RuntimeError):
    pass


def clean_person_descriptor(value: str) -> str:
    words = re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)?", value.lower())
    return " ".join(words[:2]) if words else "tracked person"


class GeminiPersonDescriptor:
    def __init__(self, *, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv(
            "GEMINI_VISION_MODEL",
            os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite"),
        )

    def describe(self, image_jpeg: bytes) -> str:
        if not self.api_key:
            raise PersonDescriptionUnavailable("GEMINI_API_KEY is not configured")
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(
                api_key=self.api_key,
                http_options=types.HttpOptions(timeout=3500),
            )
            response = client.models.generate_content(
                model=self.model,
                contents=[
                    types.Part.from_bytes(data=image_jpeg, mime_type="image/jpeg"),
                    (
                        "Describe the most visible clothing or accessory on the centered person "
                        "using exactly one or two lowercase words, such as 'pink swimsuit', "
                        "'orange shirt', or 'blue cap'. Do not guess race, ethnicity, skin color, "
                        "health, disability, identity, or other sensitive traits. Do not use a "
                        "sentence or punctuation. If no useful visible feature is clear, answer "
                        "'tracked person'."
                    ),
                ],
                config=types.GenerateContentConfig(temperature=0),
            )
            return clean_person_descriptor(response.text or "")
        except PersonDescriptionUnavailable:
            raise
        except Exception as error:
            raise PersonDescriptionUnavailable(
                f"Gemini could not describe the tracked person: {error}"
            ) from error
