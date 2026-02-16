#!/usr/bin/env python3
"""
Apply the provided db.sql schema to Supabase.

This script executes the SQL file against the Supabase database.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.core.database import async_engine
from sqlalchemy import text


async def apply_schema():
    """Apply db.sql schema to database."""
    sql_file = Path(__file__).parent.parent / "db.sql"
    
    if not sql_file.exists():
        print(f"❌ SQL file not found: {sql_file}")
        return
    
    print(f"Reading SQL from: {sql_file}")
    sql_content = sql_file.read_text()
    
    print("Applying schema to database...")
    
    async with async_engine.begin() as conn:
        try:
            await conn.execute(text(sql_content))
            print("✅ Schema applied successfully!")
        except Exception as e:
            print(f"❌ Error applying schema: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(apply_schema())