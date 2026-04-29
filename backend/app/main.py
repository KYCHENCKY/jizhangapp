from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import engine, Base
from .seed import seed_categories
from .routers import upload, transactions, categories, budgets, statistics, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_categories()
    yield


app = FastAPI(title="记账App API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174", "http://localhost:5175",
        "http://localhost:5176", "http://localhost:3000",
        "http://192.168.31.188:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(auth.admin_router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(categories.router, prefix="/api")
app.include_router(budgets.router, prefix="/api")
app.include_router(statistics.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
