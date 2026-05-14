"""Policy template definitions for HNDL analysis."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyTemplate:
    name: str
    threshold: float
    max_score: int


_POLICY_TEMPLATES: dict[str, PolicyTemplate] = {
    "strict": PolicyTemplate(name="strict", threshold=0.15, max_score=100),
    "balanced": PolicyTemplate(name="balanced", threshold=0.30, max_score=100),
    "lenient": PolicyTemplate(name="lenient", threshold=0.50, max_score=100),
}


def get_policy_template(name: str) -> PolicyTemplate:
    """Return a named policy template."""
    try:
        return _POLICY_TEMPLATES[name]
    except KeyError as exc:
        available = ", ".join(sorted(_POLICY_TEMPLATES))
        raise ValueError(f"Unknown policy template: {name}. Available: {available}") from exc
