"""Main analyser — orchestrates plagiarism and AI-detection checks."""

from __future__ import annotations

import itertools
from pathlib import Path

from .config import Config, config as _default_config
from .embedding_detector import EmbeddingDetector
from .moss_detector import MOSSDetector


class AIProctor:
    """High-level API for the AI Proctor system."""

    def __init__(self, cfg: Config | None = None) -> None:
        self.cfg = cfg or _default_config
        self.moss = MOSSDetector()
        self.embedding = EmbeddingDetector(self.cfg)

    # ------------------------------------------------------------------ #
    #  Plagiarism
    # ------------------------------------------------------------------ #
    def analyze_plagiarism(self, file1: str, file2: str) -> dict:
        """Compare two files for plagiarism via MOSS fingerprinting."""
        report = self.moss.compare_files(file1, file2)
        report["is_plagiarized"] = (
            report["similarity"] >= self.cfg.plagiarism_threshold
        )
        return report

    # ------------------------------------------------------------------ #
    #  AI-generated detection
    # ------------------------------------------------------------------ #
    def analyze_ai_generated(self, file: str) -> dict:
        """Detect whether a single file is AI-generated."""
        code = Path(file).read_text(encoding="utf-8")
        result = self.embedding.detect(code)
        result["file"] = file
        return result

    # ------------------------------------------------------------------ #
    #  Full analysis
    # ------------------------------------------------------------------ #
    def full_analysis(self, files: list[str]) -> dict:
        """Run plagiarism on all pairs + AI detection on every file.

        Returns
        -------
        dict
            ``plagiarism_results`` – list of pairwise comparisons.
            ``ai_detection_results`` – per-file AI detection dicts.
        """
        plagiarism_results: list[dict] = []
        for f1, f2 in itertools.combinations(files, 2):
            plagiarism_results.append(self.analyze_plagiarism(f1, f2))

        ai_results: list[dict] = []
        for f in files:
            ai_results.append(self.analyze_ai_generated(f))

        return {
            "plagiarism_results": plagiarism_results,
            "ai_detection_results": ai_results,
        }

    # ------------------------------------------------------------------ #
    #  Reporting
    # ------------------------------------------------------------------ #
    @staticmethod
    def generate_report(results: dict) -> str:
        """Return a human-readable plain-text report."""
        lines: list[str] = []
        lines.append("=" * 64)
        lines.append("  AI PROCTOR — ANALYSIS REPORT")
        lines.append("=" * 64)

        # Plagiarism section
        plag = results.get("plagiarism_results", [])
        if plag:
            lines.append("")
            lines.append("── Plagiarism Detection ──")
            for r in plag:
                flag = "⚠ PLAGIARIZED" if r["is_plagiarized"] else "✓ OK"
                lines.append(
                    f"  {Path(r['file1']).name}  ↔  {Path(r['file2']).name}  "
                    f"similarity={r['similarity']:.2%}  [{flag}]"
                )
                if r["is_plagiarized"] and r.get("matching_regions"):
                    for m in r["matching_regions"][:5]:
                        lines.append(
                            f"      L{m[0]} ↔ L{m[1]}: {m[2][:60]}"
                        )
                    if len(r["matching_regions"]) > 5:
                        lines.append(
                            f"      ... and {len(r['matching_regions']) - 5} more"
                        )

        # AI detection section
        ai = results.get("ai_detection_results", [])
        if ai:
            lines.append("")
            lines.append("── AI-Generated Code Detection ──")
            for r in ai:
                flag = "⚠ AI-GENERATED" if r["is_ai_generated"] else "✓ HUMAN"
                name = Path(r.get("file", "?")).name
                lines.append(
                    f"  {name}  "
                    f"combined={r['combined_score']:.2%}  "
                    f"(heuristic={r['heuristic_score']:.2%}, "
                    f"llm={r['llm_result']['confidence']:.2%})  [{flag}]"
                )
                reasoning = r["llm_result"].get("reasoning", "")
                if reasoning:
                    lines.append(f"      → {reasoning}")

        lines.append("")
        lines.append("=" * 64)
        return "\n".join(lines)
