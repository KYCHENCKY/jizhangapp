import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "jizhang.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

DATABASE_URL = f"sqlite:///{DB_PATH}"

SECRET_KEY = "jizhangapp-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
