from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parent
VENV = ROOT / ".venv"


def venv_python() -> Path:
    if os.name == "nt":
        return VENV / "Scripts" / "python.exe"
    return VENV / "bin" / "python"


def venv_pip() -> Path:
    if os.name == "nt":
        return VENV / "Scripts" / "pip.exe"
    return VENV / "bin" / "pip"


def npm_command() -> str:
    executable = "npm.cmd" if os.name == "nt" else "npm"
    found = shutil.which(executable)
    if found:
        return found
    fallback = shutil.which("npm")
    if fallback:
        return fallback
    raise RuntimeError("npm was not found. Install Node.js, then run this script again.")


def run(command: list[str | Path]) -> None:
    printable = " ".join(str(part) for part in command)
    print(f"\n> {printable}")
    subprocess.check_call([str(part) for part in command], cwd=ROOT)


def main() -> int:
    if not venv_python().exists():
        run([sys.executable, "-m", "venv", VENV])

    run([venv_pip(), "install", "-r", "requirements.txt"])

    npm = npm_command()

    if not (ROOT / "node_modules").exists():
        run([npm, "install"])

    run([npm, "run", "build"])

    env = os.environ.copy()
    env.setdefault("PORT", "8770")
    print("\nLanguage Output Lab: http://127.0.0.1:8770")
    return subprocess.call([str(venv_python()), "app.py"], cwd=ROOT, env=env)


if __name__ == "__main__":
    raise SystemExit(main())
