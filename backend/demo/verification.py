from __future__ import annotations

import re
from typing import Protocol

from .gemini import AnswerVerificationUnavailable


class AnswerVerifier(Protocol):
    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool: ...


_FEMALE = {"girl", "woman", "female", "lady"}
_MALE = {"boy", "man", "male", "guy"}
_COLORS = {
    "black", "white", "pink", "orange", "red", "blue", "green", "yellow",
    "purple", "brown", "gray", "grey",
}
_CLOTHING = {
    "shirt", "top", "suit", "swimsuit", "shorts", "trunks", "cap", "hat",
}
_SIZE = {"big", "large", "small", "little", "tall", "short"}
_LOCATION = {"left", "right", "middle", "center", "top", "bottom"}
_GENERIC = {
    "a", "an", "the", "in", "on", "at", "near", "wearing", "with", "person",
    "swimmer", "someone", "they", "their", "clothes", "clothing",
}


def _words(value: str) -> set[str]:
    words = set(re.findall(r"[a-z]+", value.lower()))
    if "dark" in words:
        words.add("black")
    if "centre" in words:
        words.add("center")
    if "center" in words:
        words.add("middle")
    return words


class LocalAnswerVerifier:
    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool:
        submitted_words = _words(submitted)
        reference_words = _words(reference_description)
        location_words = _words(reference_location or "")

        if not self._location_matches(submitted_words, location_words):
            return False
        return self._descriptor_matches(submitted_words, reference_words)

    @staticmethod
    def _location_matches(submitted: set[str], reference: set[str]) -> bool:
        given = submitted & _LOCATION
        if not given or not reference:
            return False
        if "left" in given and "right" in reference:
            return False
        if "right" in given and "left" in reference:
            return False
        if "top" in given and "bottom" in reference:
            return False
        if "bottom" in given and "top" in reference:
            return False
        normalized_reference = set(reference)
        if "center" in normalized_reference:
            normalized_reference.add("middle")
        return bool(given & normalized_reference)

    @staticmethod
    def _descriptor_matches(submitted: set[str], reference: set[str]) -> bool:
        submitted_gender = (_FEMALE if submitted & _FEMALE else set()) | (
            _MALE if submitted & _MALE else set()
        )
        reference_gender = (_FEMALE if reference & _FEMALE else set()) | (
            _MALE if reference & _MALE else set()
        )
        if submitted_gender and reference_gender:
            submitted_is_female = bool(submitted & _FEMALE)
            reference_is_female = bool(reference & _FEMALE)
            if submitted_is_female != reference_is_female:
                return False

        submitted_colors = submitted & _COLORS
        reference_colors = reference & _COLORS
        if submitted_colors and reference_colors and not submitted_colors <= reference_colors:
            return False

        if submitted_gender and reference_gender:
            return True
        if submitted_colors & reference_colors:
            return True
        if submitted & reference & (_CLOTHING | _SIZE):
            return True

        submitted_specific = submitted - _GENERIC - _LOCATION
        reference_specific = reference - _GENERIC - _LOCATION
        return bool(submitted_specific & reference_specific)


class GeminiFirstAnswerVerifier:
    def __init__(self, primary: AnswerVerifier, fallback: AnswerVerifier) -> None:
        self.primary = primary
        self.fallback = fallback

    def verify(
        self,
        submitted: str,
        *,
        reference_description: str,
        reference_location: str | None,
    ) -> bool:
        try:
            return self.primary.verify(
                submitted,
                reference_description=reference_description,
                reference_location=reference_location,
            )
        except AnswerVerificationUnavailable:
            return self.fallback.verify(
                submitted,
                reference_description=reference_description,
                reference_location=reference_location,
            )
