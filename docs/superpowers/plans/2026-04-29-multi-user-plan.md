# Multi-User System Implementation Plan

> **For agentic workers:** Implement tasks sequentially. Each task depends on the previous.

**Goal:** Add user registration, JWT login, per-user data isolation, and admin user management.

**Architecture:** JWT-based auth with bcrypt password hashing. All existing tables get a user_id FK. A get_current_user dependency injected into all endpoints auto-filters queries. Registration seeds default categories per user. Admin flag controls user management access.

**Tech Stack:** passlib[bcrypt], python-jose for backend auth; React Context + localStorage for frontend auth state.

---

### Task 1: Install backend auth dependencies

- [ ] **Step 1: Add packages to requirements.txt**

Append to `backend/requirements.txt`:
```
passlib[bcrypt]>=1.7.4
python-jose[cryptography]>=3.3.0
```

- [ ] **Step 2: Install**

```bash
cd backend && pip install passlib[bcrypt] python-jose[cryptography]
```

---

### Task 2: Add User model and migration

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/migrate_users.py`

- [ ] **Step 1: Add User model to models.py**

After the imports and before `Category` class:

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Integer, default=0)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=func.now())

    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    rules = relationship("CategoryRule", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    import_batches = relationship("ImportBatch", back_populates="user", cascade="all, delete-orphan")
```

- [ ] **Step 2: Add user_id to all existing models**

Add to Category:
```python
user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
user = relationship("User", back_populates="categories")
```

Add to Budget:
```python
user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
user = relationship("User", back_populates="budgets")
```

Add to CategoryRule:
```python
user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
user = relationship("User", back_populates="rules")
```

Add to ImportBatch:
```python
user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
user = relationship("User", back_populates="import_batches")
```

Add to Transaction:
```python
user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
user = relationship("User", back_populates="transactions")
```

- [ ] **Step 3: Create migration script**

Create `backend/migrate_users.py`:
```python
"""One-time migration: create users table and add user_id columns."""
from app.database import engine, Base
from app.models import User
from sqlalchemy import text

def migrate():
    # Create users table
    Base.metadata.create_all(bind=engine)
    
    with engine.connect() as conn:
        # Add user_id columns if they don't exist
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
```

- [ ] **Step 4: Run migration**

```bash
cd backend && python migrate_users.py
```

---

### Task 3: Backend auth module

**Files:**
- Create: `backend/app/auth.py`
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add config values**

Append to `backend/app/config.py`:
```python
SECRET_KEY = "change-me-in-production-use-env-var"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
```

- [ ] **Step 2: Create auth.py**

```python
"""JWT authentication: token creation, verification, current user extraction."""
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from .database import get_db
from .models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user
```

---

### Task 4: Backend auth routes

**Files:**
- Create: `backend/app/routers/auth.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Add auth schemas to schemas.py**

Append:
```python
# ============ Auth ============
class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=4, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class TokenResponse(BaseModel):
    access_token: str
    user: UserOut
```

- [ ] **Step 2: Create auth router**

```python
"""Auth endpoints: register, login, me, admin user management."""
from fastapi import APIRouter, Depends, HTTPException
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

    token = create_access_token({"sub": user.id})
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

    token = create_access_token({"sub": user.id})
    return ApiResponse(data={
        "access_token": token,
        "user": UserOut.model_validate(user).model_dump(),
    }, message="登录成功")


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return ApiResponse(data=UserOut.model_validate(current_user).model_dump())


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
    is_active: bool = None,
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
```

- [ ] **Step 3: Register routers in main.py**

In `main.py`, add imports and router registration:
```python
from .routers import auth
# ... after existing router registrations:
app.include_router(auth.router, prefix="/api")
app.include_router(auth.admin_router, prefix="/api")
```

---

### Task 5: Add user_id filtering to all business endpoints

**Files:**
- Modify: `backend/app/routers/transactions.py`
- Modify: `backend/app/routers/budgets.py`
- Modify: `backend/app/routers/categories.py`
- Modify: `backend/app/routers/upload.py`
- Modify: `backend/app/routers/statistics.py`
- Modify: `backend/app/services/budget_service.py`
- Modify: `backend/app/services/category_service.py`
- Modify: `backend/app/services/statistics_service.py`

Pattern: Every endpoint gets `current_user = Depends(get_current_user)` and every query adds `.filter(Model.user_id == current_user.id)`.

For every router, add the import:
```python
from ..auth import get_current_user
```

For every endpoint function signature, add:
```python
current_user: User = Depends(get_current_user),
```

For every query, add a `.filter(Model.user_id == current_user.id)` clause. For creates, set `user_id=current_user.id`.

For `transactions.py` list endpoint:
```python
query = db.query(Transaction).options(joinedload(Transaction.category))
query = query.filter(Transaction.user_id == current_user.id)
```

For `budgets.py`, `categories.py` — same pattern on all queries and creates.

For `upload.py` — add user_id to ImportBatch and Transaction objects on creation.

For `statistics.py` — pass `user_id` through to service functions.

For service functions (`budget_service.py`, `category_service.py`, `statistics_service.py`) — add `user_id: int` parameter and filter all queries.

---

### Task 6: Frontend auth types, API, and context

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/hooks/useAuth.tsx`

- [ ] **Step 1: Add types**

In `types/index.ts`:
```typescript
export interface User {
  id: number;
  username: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  user: User;
}
```

- [ ] **Step 2: Create auth API**

`api/auth.ts`:
```typescript
import client from "./client";
import type { ApiResponse, User, TokenResponse } from "../types";

export const login = (data: { username: string; password: string }): Promise<ApiResponse<TokenResponse>> =>
  client.post("/auth/login", data);

export const register = (data: { username: string; password: string }): Promise<ApiResponse<TokenResponse>> =>
  client.post("/auth/register", data);

export const fetchMe = (): Promise<ApiResponse<User>> =>
  client.get("/auth/me");

export const fetchUsers = (): Promise<ApiResponse<User[]>> =>
  client.get("/admin/users");

export const updateUser = (id: number, data: { is_active: boolean }): Promise<ApiResponse<null>> =>
  client.patch(`/admin/users/${id}`, data);

export const deleteUser = (id: number): Promise<ApiResponse<null>> =>
  client.delete(`/admin/users/${id}`);
```

- [ ] **Step 3: Create AuthContext**

`hooks/useAuth.tsx`:
```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "../api/auth";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    if (token) {
      api.fetchMe().then(r => { setUser(r.data); }).catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const r = await api.login({ username, password });
    localStorage.setItem("token", r.data.access_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const r = await api.register({ username, password });
    localStorage.setItem("token", r.data.access_token);
    setToken(r.data.access_token);
    setUser(r.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    qc.clear();
  }, [qc]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Update axios client to attach token**

Modify `api/client.ts`:
```typescript
import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:8000/api",
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) return response;
    return { ...response, data: { success: true, data: response.data, message: "ok" } };
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    const msg = error.response?.data?.detail || error.response?.data?.message || error.message;
    return Promise.reject(new Error(msg));
  }
);

export default client;
```

---

### Task 7: Frontend login/register pages

**Files:**
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: LoginPage**

```tsx
import { useState } from "react";
import { Card, Form, Input, Button, message, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success("登录成功");
      navigate("/");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fdf5e6 0%, #fffdf9 100%)" }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>记账助手</Typography.Title>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center" }}>
          还没有账号？<Link to="/register">立即注册</Link>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: RegisterPage** (similar to LoginPage but with register call, confirm password)

```tsx
import { useState } from "react";
import { Card, Form, Input, Button, message, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.username, values.password);
      message.success("注册成功");
      navigate("/");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fdf5e6 0%, #fffdf9 100%)" }}>
      <Card style={{ width: 400, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginBottom: 24 }}>注册账号</Typography.Title>
        <Form onFinish={handleSubmit} size="large">
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 4, message: "密码至少4位" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item name="confirm" dependencies={["password"]} rules={[
            { required: true, message: "请确认密码" },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("password") === value) return Promise.resolve();
                return Promise.reject(new Error("两次密码不一致"));
              },
            }),
          ]}>
            <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center" }}>
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Update App.tsx routing**

Wrap with AuthProvider, add login/register routes, add ProtectedRoute:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import TransactionsPage from "./pages/TransactionsPage";
import StatisticsPage from "./pages/StatisticsPage";
import BudgetsPage from "./pages/BudgetsPage";
import CategoriesPage from "./pages/CategoriesPage";
import ImportPage from "./pages/ImportPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import { Spin } from "antd";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <Spin style={{ display: "block", margin: "200px auto" }} />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { colorPrimary: "#f0835b", borderRadius: 8 } }}>
        <AntApp>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="transactions" element={<TransactionsPage />} />
                  <Route path="statistics" element={<StatisticsPage />} />
                  <Route path="budgets" element={<BudgetsPage />} />
                  <Route path="categories" element={<CategoriesPage />} />
                  <Route path="import" element={<ImportPage />} />
                  <Route path="admin/users" element={<AdminUsersPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
```

---

### Task 8: Update AppLayout with user info and logout

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

Add user display and logout button at bottom of sidebar. Also add "用户管理" menu item for admins.

In the Sider, after the Menu, add:
```tsx
import { useAuth } from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";

// Inside component:
const { user, logout } = useAuth();
const navigate = useNavigate();

// Add admin menu item if is_admin
const menuItems = [
  // ... existing items ...
  ...(user?.is_admin ? [{ key: "/admin/users", icon: <TeamOutlined />, label: "用户管理" }] : []),
];

// At bottom of Sider, after Menu:
<div style={{
  position: "absolute", bottom: 0, left: 0, right: 0,
  padding: "12px 16px", borderTop: "1px solid #f0e4d8",
  display: "flex", alignItems: "center", justifyContent: "space-between",
}}>
  <span style={{ fontWeight: 500, color: "#4a3728", fontSize: 13 }}>
    {user?.username}
    {user?.is_admin && <Tag color="orange" style={{ marginLeft: 4, fontSize: 10 }}>管理员</Tag>}
  </span>
  <Button type="text" size="small" danger onClick={logout}>退出</Button>
</div>
```

---

### Task 9: Admin Users Page

**Files:**
- Create: `frontend/src/pages/AdminUsersPage.tsx`

```tsx
import { Table, Tag, Button, Popconfirm, message, Switch } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/auth";
import { formatDateTime } from "../utils/formatters";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.fetchUsers().then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.updateUser(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); message.success("已更新"); },
    onError: (err) => message.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); message.success("已删除"); },
    onError: (err) => message.error(err.message),
  });

  const columns = [
    { title: "用户名", dataIndex: "username" },
    { title: "角色", dataIndex: "is_admin", render: (v: boolean) => v ? <Tag color="orange">管理员</Tag> : <Tag>用户</Tag> },
    {
      title: "状态", dataIndex: "is_active",
      render: (v: boolean, r: { id: number }) => (
        <Switch checked={v} onChange={(checked) => toggleMutation.mutate({ id: r.id, is_active: checked })} />
      ),
    },
    { title: "注册时间", dataIndex: "created_at", render: (v: string) => formatDateTime(v) },
    {
      title: "操作",
      render: (_: unknown, r: { id: number }) => (
        <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>用户管理</h2>
      <Table columns={columns} dataSource={users ?? []} rowKey="id" loading={isLoading} size="small" />
    </div>
  );
}
```

---

### Task 10: Fix seed.py for multi-user

**Files:**
- Modify: `backend/app/seed.py`

The global seed check `db.query(Category).count() > 0` no longer works because categories now have user_id. For the zero-user state (fresh DB), seed global defaults. On user registration, _seed_defaults in auth.py handles per-user seeding.

Keep seed.py as-is but update the check to account for user_id being null for global defaults:
```python
existing = db.query(Category).filter(Category.user_id.is_(None)).count()
```
This allows the global defaults to exist (user_id=null) for the migration of existing data.

Actually, after migration, existing data has user_id=null. The seed should no longer run after the first user exists. Change the check to:
```python
existing = db.query(User).count()
if existing > 0:
    return
```
This seeds defaults only if there are zero users.

---

### Task 11: Integration test

- [ ] **Step 1: Start backend and test register/login**

```bash
curl -X POST http://localhost:8000/api/auth/register -H "Content-Type: application/json" -d '{"username":"admin","password":"1234"}'
# Expected: token + user with is_admin=true

curl -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"1234"}'
# Expected: token + user
```

- [ ] **Step 2: Test data isolation**

Register a second user, create categories/transactions, verify each user only sees their own data.

- [ ] **Step 3: Test admin endpoints**

As admin, GET /api/admin/users, PATCH a user's is_active, DELETE a user.
As non-admin, verify 403 Forbidden.

- [ ] **Step 4: Frontend smoke test**

Start frontend, verify redirect to /login, register a new user, login, use the app, verify logout.

---

### Task 12: Final migration

**Files:**
- Create: `backend/migrate_existing_data.py`

Assign all existing data (with user_id=null) to the first admin user:
```python
from app.database import SessionLocal
from app.models import User, Transaction, Category, Budget, CategoryRule, ImportBatch

db = SessionLocal()
admin = db.query(User).filter(User.is_admin == 1).first()
if admin:
    for model in [Transaction, Category, Budget, CategoryRule, ImportBatch]:
        cnt = db.query(model).filter(model.user_id.is_(None)).update(
            {model.user_id: admin.id}, synchronize_session=False
        )
        db.commit()
        print(f"Assigned {cnt} {model.__tablename__} to admin (id={admin.id})")
db.close()
```

Run: `python backend/migrate_existing_data.py`
