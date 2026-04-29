"""One-time migration: create users table and add user_id columns."""
from app.database import engine, Base
from app.models import User
from sqlalchemy import text

def migrate():
    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        for table in ["categories", "budgets", "category_rules", "import_batches", "transactions"]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.execute(text(f"CREATE INDEX IF NOT EXISTS idx_{table}_user ON {table}(user_id)"))
                print(f"  Added user_id to {table}")
            except Exception as e:
                if "duplicate column" in str(e).lower():
                    print(f"  {table} already has user_id")
                else:
                    print(f"  {table}: {e}")
        conn.commit()
    print("Migration complete")

if __name__ == "__main__":
    migrate()
