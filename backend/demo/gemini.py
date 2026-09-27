from __future__ import annotations

import os

from pydantic import BaseModel, ConfigDict


class AnswerVerificationUnavailable(RuntimeError):
    pass


class _GeminiDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    same_person: bool


class GeminiAnswerVerifier:
    def __init__(self, *, api_key: str | None = None, model: str | None = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool:
        if not self.api_key:
            raise AnswerVerificationUnavailable(
                "GEMINI_API_KEY is not configured"
            )
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self.api_key)
            location = reference_location or "not provided"
            response = client.models.generate_content(
                model=self.model,
                contents=(
                    "Decide whether the submitted phrase identifies the same person as "
                    "the reference annotation. Accept ordinary synonyms, omitted articles, "
                    "and harmless wording differences. Reject a different person, a conflicting "
                    "appearance, or an answer too vague to identify the reference person.\n\n"
                    f"Reference description: {reference_description}\n"
                    f"Reference camera location: {location}\n"
                    f"Submitted phrase: {submitted}"
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "same_person": types.Schema(type=types.Type.BOOLEAN)
                        },
                        required=["same_person"],
                    ),
                    temperature=0,
                ),
            )
            parsed = response.parsed
            if isinstance(parsed, _GeminiDecision):
                return parsed.same_person
            if isinstance(parsed, dict):
                return _GeminiDecision.model_validate(parsed).same_person
            return _GeminiDecision.model_validate_json(response.text).same_person
        except AnswerVerificationUnavailable:
            raise
        except Exception as error:
            raise AnswerVerificationUnavailable(
                f"Gemini could not check the answer: {error}"
            ) from error
