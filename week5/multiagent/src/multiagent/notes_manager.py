"""Manager notes file helper for persisting interaction history and context."""

import os
from datetime import datetime
from pathlib import Path
from multiagent.config import DEFAULT_NOTES_FILE


class NotesManager:
    """Manages reading and writing contextual notes for the Manager Agent."""

    def __init__(self, file_path: Path = DEFAULT_NOTES_FILE):
        self.file_path = Path(file_path)

    def read_notes(self) -> str:
        """Read all notes from the file."""
        if not self.file_path.exists():
            return "No previous notes recorded."
        try:
            content = self.file_path.read_text(encoding="utf-8").strip()
            return content if content else "No previous notes recorded."
        except Exception as exc:
            return f"Error reading notes: {exc}"

    def append_note(self, note: str, tag: str = "Manager Note") -> None:
        """Append a timestamped entry to the notes file."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] [{tag}]\n{note.strip()}\n\n"
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "a", encoding="utf-8") as f:
                f.write(entry)
        except Exception as exc:
            print(f"[NotesManager] Failed to append note: {exc}")

    def overwrite_notes(self, content: str) -> None:
        """Overwrite the notes file with updated context."""
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                f.write(content.strip() + "\n")
        except Exception as exc:
            print(f"[NotesManager] Failed to overwrite notes: {exc}")

    def clear(self) -> None:
        """Clear the notes file."""
        if self.file_path.exists():
            try:
                self.file_path.unlink()
            except Exception as exc:
                print(f"[NotesManager] Failed to delete notes file: {exc}")
