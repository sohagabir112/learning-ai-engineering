from pathlib import Path
from .config import get_workspace_root

# Directories that should never be searched or modified
BLOCKED_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
    ".idea",
    ".vscode",
}

# Supported text and source code extensions
TEXT_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".html", ".css", ".md",
    ".yaml", ".yml", ".txt", ".sh", ".c", ".cpp", ".cc", ".h", ".hpp",
    ".rs", ".go", ".java", ".sql", ".toml", ".xml", ".ini", ".cfg",
    ".env.example", ".csv", ".svg",
}

SPECIAL_ALLOWED_FILES = {
    "Dockerfile",
    "Makefile",
    ".gitignore",
    "pyproject.toml",
    "package.json",
    "tsconfig.json",
}


class SafetyError(ValueError):
    """Raised when an operation violates workspace sandbox boundaries."""
    pass


def safe_path(path_str: str | Path, *, must_exist: bool = True, allow_dir: bool = False) -> Path:
    """
    Resolves path_str and ensures it is securely located within the active workspace root.
    Blocks directory traversal, access to .git, .env files, and non-text files.
    """
    root = get_workspace_root()

    if not path_str or str(path_str).strip() in {"", "."}:
        if allow_dir:
            return root
        raise SafetyError("File path must not be empty.")

    p = Path(path_str)
    if not p.is_absolute():
        p = root / p

    try:
        resolved = p.resolve(strict=must_exist)
    except FileNotFoundError:
        if must_exist:
            raise SafetyError(f"File not found: {path_str}")
        resolved = p.resolve(strict=False)

    # Ensure path stays within root
    if not resolved.is_relative_to(root):
        raise SafetyError(f"Access denied: '{path_str}' is outside the active workspace ({root.name}).")

    # Check for blocked directories in path segments
    try:
        rel_parts = resolved.relative_to(root).parts
    except ValueError:
        raise SafetyError(f"Access denied: '{path_str}' is outside the workspace.")

    for part in rel_parts:
        if part in BLOCKED_DIRS:
            raise SafetyError(f"Access denied: directory '{part}' is restricted.")

    if resolved.is_dir():
        if allow_dir:
            return resolved
        raise SafetyError(f"Target is a directory, not a file: {path_str}")

    # Block access to secret and environment files
    name_lower = resolved.name.lower()
    if name_lower == ".env" or (name_lower.startswith(".env.") and name_lower != ".env.example"):
        raise SafetyError("Access to .env and secret files is strictly prohibited.")

    # Validate file extension
    if resolved.suffix.lower() not in TEXT_EXTENSIONS and resolved.name not in SPECIAL_ALLOWED_FILES:
        raise SafetyError(f"Unsupported file type '{resolved.suffix}'. Only text/source files are allowed.")

    return resolved


def safe_rel_path(path: Path) -> str:
    """Normalizes a resolved path to a clean forward-slash relative path from the active workspace root."""
    root = get_workspace_root()
    try:
        rel = path.resolve().relative_to(root)
        return rel.as_posix()
    except ValueError:
        return path.name
