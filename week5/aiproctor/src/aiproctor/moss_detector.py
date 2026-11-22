"""MOSS-inspired plagiarism detector using the winnowing algorithm."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path


class MOSSDetector:
    """Detect code plagiarism via winnowed fingerprint comparison."""

    # ------------------------------------------------------------------ #
    #  Preprocessing
    # ------------------------------------------------------------------ #
    @staticmethod
    def preprocess(code: str) -> str:
        """Strip comments, normalise whitespace, and lower-case the source."""

        # Remove single-line comments (# …)
        code = re.sub(r"#.*", "", code)
        # Remove multi-line strings used as comments (triple-quoted)
        code = re.sub(r'("""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\')', "", code)
        # Collapse whitespace & blank lines
        code = re.sub(r"[ \t]+", " ", code)
        code = re.sub(r"\n\s*\n", "\n", code)
        # Normalise variable names: replace identifiers with a placeholder
        # (keeps keywords & builtins intact for a lightweight approach)
        code = code.strip().lower()
        return code

    # ------------------------------------------------------------------ #
    #  Winnowing / fingerprinting
    # ------------------------------------------------------------------ #
    @staticmethod
    def _hash_kgram(kgram: str) -> int:
        """Deterministic integer hash for a k-gram string."""
        return int(hashlib.md5(kgram.encode("utf-8")).hexdigest(), 16)

    def get_fingerprints(
        self, code: str, k: int = 5, window: int = 4
    ) -> set[int]:
        """Return the winnowed fingerprint set for *code*.

        Parameters
        ----------
        k : int
            Length of each character-level k-gram.
        window : int
            Winnowing window size.
        """
        text = self.preprocess(code)
        if len(text) < k:
            return set()

        # Build k-grams and hash them
        hashes = [
            self._hash_kgram(text[i : i + k]) for i in range(len(text) - k + 1)
        ]

        # Winnowing: pick the minimum hash in each sliding window
        fingerprints: set[int] = set()
        for i in range(len(hashes) - window + 1):
            win = hashes[i : i + window]
            fingerprints.add(min(win))
        return fingerprints

    # ------------------------------------------------------------------ #
    #  Similarity
    # ------------------------------------------------------------------ #
    def calculate_similarity(self, code1: str, code2: str) -> float:
        """Jaccard similarity of two code snippets' fingerprint sets."""
        fp1 = self.get_fingerprints(code1)
        fp2 = self.get_fingerprints(code2)
        if not fp1 and not fp2:
            return 1.0
        if not fp1 or not fp2:
            return 0.0
        intersection = fp1 & fp2
        union = fp1 | fp2
        return len(intersection) / len(union)

    # ------------------------------------------------------------------ #
    #  Line-level matching
    # ------------------------------------------------------------------ #
    def find_matching_regions(
        self, code1: str, code2: str, k: int = 5
    ) -> list[tuple[int, int, str]]:
        """Find k-gram matches and map them back to approximate line numbers.

        Returns a list of ``(line_in_code1, line_in_code2, matched_text)``
        tuples.
        """
        lines1 = code1.splitlines()
        lines2 = code2.splitlines()

        # Build a lookup: hash -> list of (line_index, raw_text) in code2
        hash_to_lines2: dict[int, list[tuple[int, str]]] = {}
        for idx, line in enumerate(lines2):
            norm = self.preprocess(line).strip()
            if len(norm) >= k:
                h = self._hash_kgram(norm[:k])
                hash_to_lines2.setdefault(h, []).append((idx + 1, line.strip()))

        matches: list[tuple[int, int, str]] = []
        for idx1, line in enumerate(lines1):
            norm = self.preprocess(line).strip()
            if len(norm) < k:
                continue
            h = self._hash_kgram(norm[:k])
            for idx2, text2 in hash_to_lines2.get(h, []):
                matches.append((idx1 + 1, idx2, text2))
        return matches

    # ------------------------------------------------------------------ #
    #  High-level comparison
    # ------------------------------------------------------------------ #
    def compare_files(self, file1: str, file2: str) -> dict:
        """Compare two source files and return a detailed plagiarism report.

        Returns
        -------
        dict
            Keys: ``similarity``, ``is_plagiarized``, ``matching_regions``,
            ``file1``, ``file2``, ``fingerprint_count_1``,
            ``fingerprint_count_2``, ``shared_fingerprints``.
        """
        code1 = Path(file1).read_text(encoding="utf-8")
        code2 = Path(file2).read_text(encoding="utf-8")

        fp1 = self.get_fingerprints(code1)
        fp2 = self.get_fingerprints(code2)
        shared = fp1 & fp2

        similarity = (
            len(shared) / len(fp1 | fp2) if (fp1 | fp2) else 1.0
        )
        matching_regions = self.find_matching_regions(code1, code2)

        return {
            "file1": file1,
            "file2": file2,
            "similarity": round(similarity, 4),
            "is_plagiarized": similarity >= 0.40,  # default threshold
            "fingerprint_count_1": len(fp1),
            "fingerprint_count_2": len(fp2),
            "shared_fingerprints": len(shared),
            "matching_regions": matching_regions,
        }
