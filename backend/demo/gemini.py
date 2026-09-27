from __future__ import annotations

import os

from pydantic import BaseModel, ConfigDict


class AnswerVerificationUnavailable(RuntimeError):
    pass


class _GeminiDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")
    descriptor_matches: bool
    location_matches: bool


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

            client = genai.Client(
                api_key=self.api_key,
                http_options=types.HttpOptions(timeout=4000),
            )
            location = reference_location or "not provided"
            response = client.models.generate_content(
                model=self.model,
                contents=(
                    "Evaluate a quickly typed description of a person in pool footage. Return two separate "
                    "booleans. descriptor_matches is true only when the submission contains at least one "
                    "accurate identifying trait from the reference description, such as boy/girl/man/woman, "
                    "race, clothing, or clothing color. Generic words such as person, swimmer, someone, or "
                    "they do not count as an identifying trait. Accept ordinary synonyms, such as woman for "
                    "girl when the wording could reasonably describe the same person. Any contradictory "
                    "identity or appearance detail makes descriptor_matches false. location_matches is true "
                    "only when the submission includes a camera-view direction that is compatible with the "
                    "reference location. The location may be shorter but must preserve the direction it names: "
                    "right matches middle-right, top right matches middle/top-right, and middle matches "
                    "middle-center. Left never matches right, and top never matches bottom. If the submission "
                    "omits a usable location, location_matches must be false. Do not infer either match from "
                    "context. The answer is accepted by the application only when both booleans are true.\n\n"
                    f"Reference description: {reference_description}\n"
                    f"Reference camera location: {location}\n"
                    f"Submitted phrase: {submitted}"
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "descriptor_matches": types.Schema(type=types.Type.BOOLEAN),
                            "location_matches": types.Schema(type=types.Type.BOOLEAN),
                        },
                        required=["descriptor_matches", "location_matches"],
                    ),
                    temperature=0,
                ),
            )
            parsed = response.parsed
            if isinstance(parsed, _GeminiDecision):
                decision = parsed
            elif isinstance(parsed, dict):
                decision = _GeminiDecision.model_validate(parsed)
            else:
                decision = _GeminiDecision.model_validate_json(response.text)
            return decision.descriptor_matches and decision.location_matches
        except AnswerVerificationUnavailable:
            raise
        except Exception as error:
            raise AnswerVerificationUnavailable(
                f"Gemini could not check the answer: {error}"
            ) from error
