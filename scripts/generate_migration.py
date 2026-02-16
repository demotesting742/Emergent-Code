#!/usr/bin/env python3
"""
Generate Alembic migration from current models.
"""

import subprocess
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent / "backend"

print("Generating Alembic migration...")
result = subprocess.run(
    [sys.executable, "-m", "alembic", "revision", "--autogenerate", "-m", "initial_schema"],
    cwd=backend_dir,
    capture_output=True,
    text=True
)

print(result.stdout)
if result.stderr:
    print(result.stderr, file=sys.stderr)

if result.returncode == 0:
    print("✅ Migration generated successfully!")
else:
    print("❌ Failed to generate migration")
    sys.exit(1)