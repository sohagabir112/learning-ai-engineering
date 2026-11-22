"""AI-generated code detector using heuristics + LLM analysis via Groq."""

from __future__ import annotations

import json
import re
import statistics
from textwrap import dedent

from .config import Config, config as _default_config


class EmbeddingDetector:
    """Detect whether a piece of code was written by an AI.

    Uses a **dual** approach:
    1. Heuristic feature extraction (no network calls).
    2. LLM-based analysis via the Groq chat-completions endpoint.
    """

    def __init__(self, cfg: Config | None = None) -> None:
        self.cfg = cfg or _default_config
        self._client: OpenAI | None = None

    @property
    def client(self):
        """Lazy-loaded OpenAI client pointing at the Groq endpoint."""
        if self._client is None:
            from openai import OpenAI  # lazy import

            self.cfg.validate()
            self._client = OpenAI(
                api_key=self.cfg.groq_api_key,
                base_url=self.cfg.groq_base_url,
            )
        return self._client

    # ------------------------------------------------------------------ #
    #  Feature extraction
    # ------------------------------------------------------------------ #
    @staticmethod
    def extract_code_features(code: str) -> dict:
        """Extract stylistic / structural features from *code*.

        Returns a dict with keys:
        ``avg_line_length``, ``comment_ratio``, ``docstring_ratio``,
        ``type_hint_usage``, ``naming_consistency``, ``complexity_uniformity``.
        """
        lines = code.splitlines()
        total_lines = max(len(lines), 1)
        non_empty = [l for l in lines if l.strip()]
        non_empty_count = max(len(non_empty), 1)

        # --- average line length ---
        avg_line_length = (
            statistics.mean(len(l) for l in non_empty) if non_empty else 0.0
        )

        # --- comment ratio ---
        comment_lines = sum(
            1 for l in lines if l.strip().startswith("#")
        )
        comment_ratio = comment_lines / total_lines

        # --- docstring ratio ---
        docstrings = re.findall(
            r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')', code
        )
        docstring_lines = sum(d.count("\n") + 1 for d in docstrings)
        docstring_ratio = docstring_lines / total_lines

        # --- type hint usage ---
        func_defs = re.findall(r"def\s+\w+\(.*?\)", code, re.DOTALL)
        hints_in_funcs = sum(1 for f in func_defs if "->" in f or ":" in f)
        type_hint_usage = (
            hints_in_funcs / max(len(func_defs), 1) if func_defs else 0.0
        )

        # --- naming consistency (snake_case ratio of identifiers) ---
        identifiers = re.findall(r"\b([a-zA-Z_]\w*)\b", code)
        snake = sum(1 for i in identifiers if re.match(r"^[a-z_][a-z0-9_]*$", i))
        naming_consistency = snake / max(len(identifiers), 1)

        # --- complexity uniformity (std-dev of indentation depths) ---
        indents = [
            len(l) - len(l.lstrip()) for l in non_empty
        ]
        complexity_uniformity = (
            1.0 / (1.0 + statistics.pstdev(indents)) if indents else 1.0
        )

        return {
            "avg_line_length": round(avg_line_length, 2),
            "comment_ratio": round(comment_ratio, 4),
            "docstring_ratio": round(docstring_ratio, 4),
            "type_hint_usage": round(type_hint_usage, 4),
            "naming_consistency": round(naming_consistency, 4),
            "complexity_uniformity": round(complexity_uniformity, 4),
        }

    # ------------------------------------------------------------------ #
    #  Heuristic scoring
    # ------------------------------------------------------------------ #
    @staticmethod
    def calculate_ai_probability(features: dict) -> float:
        """Return a 0-1 probability that the code is AI-generated.

        Higher values → more likely AI.  Uses a weighted sum of signals
        that tend to be elevated in AI-generated code (high docstring ratio,
        high type-hint usage, very consistent naming, uniform complexity).
        """
        weights = {
            "docstring_ratio": 2.0,
            "type_hint_usage": 2.5,
            "naming_consistency": 1.5,
            "complexity_uniformity": 1.0,
            "comment_ratio": 1.0,
        }
        score = 0.0
        total_weight = 0.0
        for key, w in weights.items():
            val = features.get(key, 0.0)
            score += val * w
            total_weight += w

        raw = score / total_weight if total_weight else 0.0
        # Clamp to [0, 1]
        return round(min(max(raw, 0.0), 1.0), 4)

    # ------------------------------------------------------------------ #
    #  LLM-based analysis
    # ------------------------------------------------------------------ #
    def llm_analyze(self, code: str) -> dict:
        """Ask the Groq LLM whether *code* looks AI-generated.

        Returns ``{"confidence": float, "reasoning": str}``.
        """
        prompt = dedent("""\
            You are an expert code-forensics analyst.  Analyse the Python
            source code below and decide whether it was written by a human
            or generated by an AI (e.g. ChatGPT / Copilot / Codex).

            Consider:
            - Naming conventions & consistency
            - Comment style and density
            - Docstring usage
            - Error-handling patterns
            - Code structure uniformity
            - Presence of "boilerplate" patterns typical of LLM output

            Respond with ONLY valid JSON (no markdown fences) with exactly
            two keys:
              "confidence": a float 0-1 (1 = certainly AI-generated),
              "reasoning": a brief explanation (≤3 sentences).

            Code to analyse:
            ```python
            {code}
            ```
        """).format(code=code[:6000])  # Truncate very long inputs

        try:
            response = self.client.chat.completions.create(
                model=self.cfg.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=512,
            )
            text = response.choices[0].message.content or ""
            # Strip possible markdown fences
            text = re.sub(r"```json\s*", "", text)
            text = re.sub(r"```\s*$", "", text)
            result = json.loads(text.strip())
            return {
                "confidence": float(result.get("confidence", 0.0)),
                "reasoning": str(result.get("reasoning", "")),
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "confidence": 0.0,
                "reasoning": f"LLM analysis failed: {exc}",
            }

    # ------------------------------------------------------------------ #
    #  Combined detection
    # ------------------------------------------------------------------ #
    def detect(self, code: str) -> dict:
        """Run heuristic + LLM analysis and return a combined verdict.

        Returns a dict with:
        ``features``, ``heuristic_score``, ``llm_result``,
        ``combined_score``, ``is_ai_generated``.
        """
        features = self.extract_code_features(code)
        heuristic = self.calculate_ai_probability(features)
        llm_result = self.llm_analyze(code)

        # Weighted combination: 40 % heuristic, 60 % LLM
        llm_conf = llm_result.get("confidence", 0.0)
        combined = 0.4 * heuristic + 0.6 * llm_conf

        return {
            "features": features,
            "heuristic_score": heuristic,
            "llm_result": llm_result,
            "combined_score": round(combined, 4),
            "is_ai_generated": combined >= self.cfg.ai_detection_threshold,
        }
