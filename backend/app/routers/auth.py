"""Auth endpoints: register, login, me, admin user management."""
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Category, CategoryRule
from ..schemas import UserRegister, UserLogin, UserOut, TokenResponse, ApiResponse
from ..auth import hash_password, verify_password, create_access_token, get_current_user, get_admin_user

router = APIRouter(prefix="/auth", tags=["auth"])


def _seed_defaults(db: Session, user_id: int):
    """Seed default categories and rules for a new user."""
    from ..seed import DEFAULT_CATEGORIES, DEFAULT_RULES

    id_map: dict[str, int] = {}
    sort = 0
    for cat in DEFAULT_CATEGORIES:
        existing = db.query(Category).filter(
            Category.name == cat["name"],
            Category.type == cat["type"],
            Category.user_id == user_id,
        ).first()
        if existing:
            id_map[cat["name"]] = existing.id
            sort += 1
            continue
        obj = Category(
            name=cat["name"], type=cat["type"], icon=cat["icon"],
            color=cat["color"], sort_order=sort, user_id=user_id,
        )
        db.add(obj)
        db.flush()
        id_map[cat["name"]] = obj.id
        sort += 1

    for rule in DEFAULT_RULES:
        cat_id = id_map.get(rule["category"])
        if cat_id:
            exists = db.query(CategoryRule).filter(
                CategoryRule.category_id == cat_id,
                CategoryRule.field == rule["field"],
                CategoryRule.pattern == rule["pattern"],
                CategoryRule.user_id == user_id,
            ).first()
            if exists:
                continue
            db.add(CategoryRule(
                category_id=cat_id,
                field=rule["field"],
                pattern=rule["pattern"],
                match_mode=rule["match_mode"],
                priority=rule.get("priority", 5),
                user_id=user_id,
            ))
    db.commit()


@router.post("/register")
def register(data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == data.username).first()
    if existing:
        raise HTTPException(400, "用户名已存在")

    is_first = db.query(User).count() == 0
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        is_admin=1 if is_first else 0,
    )
    db.add(user)
    db.flush()

    _seed_defaults(db, user.id)
    db.commit()

    token = create_access_token({"sub": str(user.id)})
    return ApiResponse(data={
        "access_token": token,
        "user": UserOut.model_validate(user).model_dump(),
    }, message="注册成功")


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "用户名或密码错误")
    if not user.is_active:
        raise HTTPException(403, "账号已被禁用")

    token = create_access_token({"sub": str(user.id)})
    return ApiResponse(data={
        "access_token": token,
        "user": UserOut.model_validate(user).model_dump(),
    }, message="登录成功")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=UserOut.model_validate(current_user).model_dump())


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=4, max_length=100)


@router.patch("/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(400, "原密码错误")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return ApiResponse(message="密码修改成功")


# ---- Admin user management ----
admin_router = APIRouter(prefix="/admin", tags=["admin"])


@admin_router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return ApiResponse(data=[UserOut.model_validate(u).model_dump() for u in users])


@admin_router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    is_active: bool = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    if is_active is not None:
        user.is_active = 1 if is_active else 0
    db.commit()
    return ApiResponse(message="更新成功")


@admin_router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(400, "不能删除自己")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "用户不存在")
    db.delete(user)
    db.commit()
    return ApiResponse(message="已删除")
