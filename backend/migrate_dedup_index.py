"""Migration: rebuild idx_txn_dedup to include user_id so different users
can import the same transaction without unique constraint violations."""
from app.database import engine, SessionLocal
from sqlalchemy import text

def migrate():
    db = SessionLocal()
    try:
        # Check if the old index exists (without user_id)
        result = db.execute(text(
            "SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_txn_dedup'"
        )).fetchone()
        if not result:
            print("Index idx_txn_dedup not found, nothing to migrate.")
            return
        sql = result[0]
        if "user_id" in sql:
            print("Index already includes user_id, nothing to migrate.")
            return

        print("Rebuilding idx_txn_dedup with user_id...")
        db.execute(text("DROP INDEX IF EXISTS idx_txn_dedup"))
        db.execute(text(
            "CREATE UNIQUE INDEX idx_txn_dedup ON transactions "
            "(source_platform, source_txn_id, user_id) WHERE source_txn_id != ''"
        ))
        db.commit()
        print("Migration complete.")
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate()
