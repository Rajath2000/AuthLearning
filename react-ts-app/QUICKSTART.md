# Quick Start Guide - React Auth Integration

## 30-Second Setup

```bash
# 1. Backend already running on http://localhost:3001?
# ✅ If yes, skip to step 2
# ❌ If no, start it: cd backend && npm run dev

# 2. Install frontend dependencies
npm install

# 3. Start frontend dev server
npm run dev

# 4. Open http://localhost:5173 in browser
```

## What You Get

✅ Complete authentication system
✅ User registration & login
✅ Protected dashboard
✅ Automatic token refresh
✅ Persistent sessions
✅ Type-safe TypeScript
✅ Beautiful UI with gradients

## Test the Flow (2 minutes)

### 1. Register Account
- Go to http://localhost:5173/register
- Email: `test@example.com`
- Password: `password123` (min 8 characters)
- Confirm: `password123`
- Click "Register"

### 2. Login
- Should redirect to `/login`
- Enter same credentials
- Click "Login"
- Should see dashboard

### 3. Dashboard
- Shows your user info
- Click "Logout"
- Redirects to home

### 4. Try Again
- Go to `/dashboard` directly
- Should redirect to login (protected!)

## File Structure (Quick Overview)

```
src/
├── services/authApi.ts          ← API client with auto token refresh
├── context/AuthContext.tsx      ← Global auth state
├── hooks/useAuth.ts             ← Custom hooks for auth
├── components/
│   ├── LoginForm.tsx            ← Login page
│   ├── RegisterForm.tsx         ← Register page
│   ├── Dashboard.tsx            ← Protected page
│   └── ProtectedRoute.tsx       ← Route guard
└── pages/Home.tsx               ← Landing page
```

## Environment Setup

Optional - for different backend URL:

```bash
# Copy template
cp .env.example .env

# Edit .env
VITE_API_URL=http://your-backend-url
```

## Key Features

### Auto Token Refresh ✨
```
- Tokens stored in localStorage
- Automatically refresh on 401
- No manual handling needed
```

### Protected Routes 🔐
```
- Wrap components with <ProtectedRoute>
- Auto-redirect to login if unauthorized
- No special configuration needed
```

### Form Validation ✔️
```
- Email format checked
- Password 8+ characters minimum
- Matching passwords required
- All errors shown to user
```

### Error Handling 🛡️
```
- Network errors handled
- Validation errors shown
- Token expiry handled
- User-friendly messages
```

## Common Tasks

### Access User Info in Any Component

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <div>Not logged in</div>;
  return <div>Hi {user?.email}!</div>;
}
```

### Manually Logout

```typescript
import { useAuth } from '@/hooks/useAuth';

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={logout}>Logout</button>;
}
```

### Protect a Route

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

### Handle Form Submission

```typescript
import { useAuthForm } from '@/hooks/useAuth';

function LoginForm() {
  const { handleLogin, formError, loading } = useAuthForm();
  
  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleLogin(email, password);
    if (success) {
      // Success - user redirected automatically
    }
  };
}
```

## Available Routes

| Route | Component | Protected |
|-------|-----------|-----------|
| `/` | Home | ❌ No |
| `/register` | RegisterForm | ❌ No |
| `/login` | LoginForm | ❌ No |
| `/dashboard` | Dashboard | ✅ Yes |

## Build for Production

```bash
npm run build
# Output: dist/ folder ready to deploy
```

## Troubleshooting

### Can't login?
1. Check backend is running: `npm run dev` (in backend folder)
2. Verify backend URL: Check `.env` file
3. Check console errors: F12 → Console tab

### Tokens not saving?
1. Check browser storage: F12 → Application → Local Storage
2. Clear cache: DevTools → Settings → Clear site data

### 401 errors?
1. Backend issue: Check backend logs
2. Token expired: Try logging in again
3. Wrong backend URL: Update `.env`

### CORS errors?
1. Backend must have CORS enabled
2. Frontend URL must be in CORS whitelist
3. Verify backend `package.json` has cors dependency

## Next Steps

1. ✅ **Now:** Test the authentication flow
2. 📚 **Later:** Read `AUTH_SETUP.md` for detailed setup
3. 🔍 **Deep Dive:** Read `INTEGRATION_GUIDE.md` for architecture
4. 🚀 **Production:** Follow checklist in `AUTH_SETUP.md`

## Useful Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check TypeScript errors
npm run tsc -- --noEmit

# List all files
find src -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css"
```

## API Endpoints

All requests automatically include JWT token:

```
POST /api/auth/register
  Body: { email, password }

POST /api/auth/login
  Body: { email, password }

POST /api/auth/refresh
  Body: { refreshToken }

POST /api/auth/logout
  (requires Authorization header)
```

## Under the Hood

### Request Flow
```
User clicks "Login"
    ↓
handleLogin() called
    ↓
authApi.login() sends request
    ↓
Interceptor adds JWT token
    ↓
POST /api/auth/login
    ↓
Backend validates & returns tokens
    ↓
Tokens saved to localStorage
    ↓
AuthContext updated
    ↓
Component re-renders
    ↓
Auto-redirect to dashboard
```

### Token Refresh Flow
```
API returns 401 (token expired)
    ↓
Interceptor catches 401
    ↓
POST /api/auth/refresh
    ↓
New tokens returned
    ↓
Tokens updated in localStorage
    ↓
Original request retried
    ↓
Success!
```

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ❌ IE 11 (not supported)

## Security Notes

🔒 **Tokens stored in localStorage**
- Accessible to JavaScript
- Use HTTPS in production
- Implement Content Security Policy

🔒 **All requests to backend**
- Tokens never sent to third parties
- Backend validates all tokens
- CORS configured for frontend URL only

🔒 **Validation on backend**
- All inputs validated
- Passwords hashed with bcrypt
- Tokens signed with secret key

## Getting Help

1. **Check browser console:** F12 → Console
2. **Check Network tab:** F12 → Network → See API responses
3. **Check localStorage:** F12 → Application → Local Storage
4. **Read docs:** AUTH_SETUP.md, INTEGRATION_GUIDE.md
5. **Check backend logs:** See backend console output

## Ready to Go! 🚀

```bash
npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001

# Try it:
# 1. Go to http://localhost:5173/register
# 2. Create an account
# 3. Login with credentials
# 4. See dashboard with your info
# 5. Click logout
# 6. Try accessing /dashboard (redirects to login)
```

**That's it! You have a complete auth system. Enjoy!**

---

For more details:
- 📖 **Setup Details:** See `AUTH_SETUP.md`
- 🏗️ **Architecture:** See `INTEGRATION_GUIDE.md`
- 📋 **Implementation:** See `IMPLEMENTATION_SUMMARY.md`
- 📂 **Files:** See `FILES_CREATED.md`
