from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Text, DateTime, ForeignKey, Index, func
)
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    rules = relationship("CategoryRule", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    import_batches = relationship("ImportBatch", back_populates="user", cascade="all, delete-orphan")


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        Index("idx_cat_name_type_user", "name", "type", "user_id", unique=True),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    type = Column(String(10), nullable=False)  # income / expense / ignore
    parent_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    icon = Column(String(50), default="")
    color = Column(String(20), default="#1677ff")
    sort_order = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="categories")
    parent = relationship("Category", remote_side=[id], backref="children")
    budgets = relationship("Budget", back_populates="category", cascade="all, delete-orphan")
    rules = relationship("CategoryRule", back_populates="category", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="category")


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    period = Column(String(10), nullable=False)  # yearly / monthly / weekly
    year = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    week_start = Column(String(10), nullable=True)
    alert_ratio = Column(Float, default=0.8)
    is_active = Column(Integer, default=1)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")


class CategoryRule(Base):
    __tablename__ = "category_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    field = Column(String(30), nullable=False)  # counterparty / product_desc / transaction_type
    pattern = Column(String(200), nullable=False)
    match_mode = Column(String(20), default="contains")  # contains / exact / regex
    priority = Column(Integer, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="rules")
    category = relationship("Category", back_populates="rules")


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    source_platform = Column(String(10), nullable=False)  # alipay / wechat
    record_count = Column(Integer, nullable=False)
    new_count = Column(Integer, default=0)
    dup_count = Column(Integer, default=0)
    date_start = Column(String(10), nullable=True)
    date_end = Column(String(10), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    imported_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="import_batches")
    transactions = relationship("Transaction", back_populates="import_batch")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    transaction_time = Column(DateTime, nullable=False, index=True)
    source_platform = Column(String(10), nullable=False, index=True)
    transaction_type = Column(String(50), default="")
    counterparty = Column(String(100), default="")
    product_desc = Column(String(200), default="")
    direction = Column(String(10), nullable=False, index=True)  # income / expense / neutral
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="")
    status = Column(String(20), default="")
    source_txn_id = Column(String(100), default="")
    merchant_order = Column(String(100), default="")
    notes = Column(Text, default="")
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    import_batch_id = Column(Integer, ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    import_batch = relationship("ImportBatch", back_populates="transactions")

    __table_args__ = (
        Index("idx_txn_dedup", "source_platform", "source_txn_id", unique=True,
              sqlite_where=source_txn_id != ""),
    )
