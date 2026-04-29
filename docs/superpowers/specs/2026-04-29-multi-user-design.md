# Multi-User System Design

## Goal
Add user registration, JWT login, per-user data isolation, and admin user management.

## Architecture

### Backend
1. **User model** — id, username (unique), password_hash (bcrypt), is_admin, is_active, created_at
2. **Data isolation** — Add user_id FK to all 5 existing tables (transactions, categories, budgets, category_rules, import_batches)
3. **JWT auth** — python-jose for token creation/verification, passlib for password hashing
4. **get_current_user dependency** — extracts user from JWT bearer token, injected into all business endpoints
5. **Auto-scope queries** — all business queries filter by current_user.id
6. **Seed per user** — on registration, copy default categories and rules for the new user
7. **Admin endpoints** — GET/PATCH/DELETE /api/admin/users (admin only)

### Frontend
1. **LoginPage, RegisterPage** — simple forms, shown when unauthenticated
2. **AuthContext** — provides currentUser, login, register, logout functions
3. **ProtectedRoute** — redirects to /login if no token
4. **Axios interceptor** — attaches Bearer token to all requests, handles 401
5. **AppLayout** — shows username + logout button; admin sees "用户管理" menu item
6. **AdminUsersPage** — user list with enable/disable/delete (admin only)

### Database
- SQLite with WAL mode (unchanged)
- Add user_id columns via migration script
- Index on user_id for performance
