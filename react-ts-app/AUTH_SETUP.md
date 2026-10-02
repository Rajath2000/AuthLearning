# Authentication Integration - Setup & Testing

## Quick Start

### Prerequisites
- Node.js 16+ installed
- Backend running on `http://localhost:3001`
- npm or yarn package manager

### Step 1: Install Dependencies

```bash
cd react-ts-app
npm install
```

This installs:
- `axios` - HTTP client with interceptor support
- `react-router-dom` - Client-side routing

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Update `.env`:
```env
VITE_API_URL=http://localhost:3001
```

### Step 3: Start the Application

```bash
npm run dev
```

The app starts on `http://localhost:5173`

### Step 4: Test the Authentication Flow

#### Register a New Account
1. Go to `http://localhost:5173/register`
2. Enter email: `test@example.com`
3. Enter password: `password123` (min 8 characters)
4. Confirm password: `password123`
5. Click "Register"
6. Should redirect to login page

#### Login
1. Go to `http://localhost:5173/login`
2. Enter registered email: `test@example.com`
3. Enter password: `password123`
4. Click "Login"
5. Should redirect to `/dashboard`

#### Dashboard
- Shows your user information
- Displays user ID and email
- Shows account creation date
- Has logout button and session refresh action

#### Logout
- Click "Logout" button on dashboard
- Should clear all tokens
- Should redirect to home page
- Login required to access dashboard again

## Architecture Overview

### Authentication Flow

```
┌─────────────────┐
│   React App     │
└────────┬────────┘
         │
         ├─ User enters credentials
         │
         ▼
┌─────────────────────────────┐
│   AuthContext (useAuth)     │  ◄── Global State
│  - user                     │
│  - accessToken              │
│  - refreshToken             │
│  - loading, error           │
└────────┬────────────────────┘
         │
         ├─ Calls API methods
         │
         ▼
┌──────────────────────────────┐
│  authApi (axios client)      │  ◄── Request/Response Handlers
│  - Interceptors              │
│  - Auto token refresh        │
│  - Error handling            │
└────────┬─────────────────────┘
         │
         ├─ HTTP requests with JWT
         │
         ▼
┌──────────────────────────────┐
│  NestJS Backend API          │  ◄── Backend
│  - /api/auth/register        │
│  - /api/auth/login           │
│  - /api/auth/refresh         │
│  - /api/auth/logout          │
└──────────────────────────────┘
```

### Component Hierarchy

```
App (with routing)
├── Home
├── LoginForm
├── RegisterForm
└── ProtectedRoute
    └── Dashboard
```

### State Management

```
localStorage
├── accessToken
├── refreshToken
└── user (JSON)
   │
   └──▶ AuthContext
       ├── user
       ├── accessToken
       ├── refreshToken
       ├── loading
       ├── error
       └── isAuthenticated
```

## File Structure

```
src/
├── components/
│   ├── AuthForm.css                 # Auth forms styling
│   ├── Dashboard.tsx                # Protected dashboard
│   ├── Dashboard.css                # Dashboard styling
│   ├── LoginForm.tsx                # Login component
│   ├── RegisterForm.tsx             # Register component
│   └── ProtectedRoute.tsx           # Route guard
│
├── context/
│   └── AuthContext.tsx              # Global auth state
│       ├── User interface
│       ├── AuthContextType interface
│       └── AuthProvider component
│
├── hooks/
│   └── useAuth.ts                   # Custom hooks
│       ├── useAuth()                # Access auth context
│       ├── usePrivateRoute()        # Check auth status
│       ├── useAuthForm()            # Form handling
│       └── useTokenRefresh()        # Manual refresh
│
├── pages/
│   ├── Home.tsx                     # Landing page
│   └── Home.css                     # Home styling
│
├── services/
│   └── authApi.ts                   # API client
│       ├── AuthApi class
│       ├── Request interceptor
│       ├── Response interceptor
│       ├── Token refresh logic
│       └── Error handling
│
├── App.tsx                          # Main app, routing
├── App.css                          # Global app styles
├── index.css                        # Global base styles
└── main.tsx                         # React entry point
```

## API Integration Details

### Request Flow

```
1. User Action (login button click)
   ↓
2. Call Hook (useAuthForm.handleLogin)
   ↓
3. Call AuthApi (authApi.login)
   ↓
4. Request Interceptor (add JWT token)
   ↓
5. Send HTTP POST /api/auth/login
   ↓
6. Backend validates credentials
   ↓
7. Return { accessToken, refreshToken, ... }
   ↓
8. Store tokens in localStorage
   ↓
9. Update AuthContext state
   ↓
10. Redirect to dashboard
```

### Response Handling

All API responses follow this structure:

```typescript
{
  status: 200,
  message: "Login successful",
  data: {
    accessToken: "eyJhbGc...",
    refreshToken: "eyJhbGc...",
    tokenType: "Bearer",
    expiresIn: 3600,
    email: "test@example.com",
    userId: "uuid-here"
  },
  timestamp: "2024-01-15T10:30:00Z"
}
```

### Token Refresh Flow

```
Protected API Request
   ↓
Check Authorization header
   ↓
Request fails with 401
   ↓
Interceptor detects 401
   ↓
Is already refreshing? 
   ├─ YES → Queue request
   └─ NO → Start refresh
   ↓
POST /api/auth/refresh
   ↓
Get new accessToken
   ↓
Update localStorage
   ↓
Update context state
   ↓
Notify queued requests
   ↓
Retry original request
```

## Key Implementation Details

### 1. Request Interceptor

```typescript
// Runs before every request
- Gets accessToken from localStorage
- Adds "Authorization: Bearer {token}" header
- Passes request through
```

### 2. Response Interceptor

```typescript
// Runs on every response
- On success: Return response as-is
- On 401:
  - Get refreshToken
  - POST to /api/auth/refresh
  - Update tokens
  - Retry original request
  - On refresh failure: Logout
- On other errors: Return error
```

### 3. Token Queue Management

```typescript
// Prevent multiple simultaneous refresh attempts
if (isRefreshing) {
  // Queue the request
  return new Promise(resolve => {
    subscribers.push(token => {
      // Retry when refresh completes
      originalRequest.headers.Authorization = `Bearer ${token}`;
      resolve(api(originalRequest));
    });
  });
}

// Start refresh
isRefreshing = true;
try {
  const newToken = await refreshAccessToken();
  // Notify all queued requests
  subscribers.forEach(callback => callback(newToken));
} finally {
  isRefreshing = false;
}
```

### 4. Persistent Storage

```typescript
// On login success
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refresh);
localStorage.setItem('user', JSON.stringify(user));

// On app mount
const token = localStorage.getItem('accessToken');
const user = JSON.parse(localStorage.getItem('user'));
// Restore context state

// On logout
localStorage.clear();
```

## Testing Scenarios

### Scenario 1: Happy Path Registration

```
Step 1: Go to /register
Step 2: Fill registration form
Step 3: Submit
Expected: Success message, redirect to /login
```

### Scenario 2: Happy Path Login

```
Step 1: Go to /login
Step 2: Enter credentials
Step 3: Submit
Expected: Dashboard loads with user info
```

### Scenario 3: Protected Route Access

```
Step 1: Go directly to /dashboard without login
Expected: Redirect to /login
```

### Scenario 4: Session Persistence

```
Step 1: Login successfully
Step 2: Refresh the page
Expected: Still logged in, dashboard loads
Step 3: Close and reopen browser
Expected: Still logged in if tokens valid
```

### Scenario 5: Logout

```
Step 1: On dashboard, click Logout
Expected: Tokens cleared, redirect to home
Step 2: Go to /dashboard
Expected: Redirect to /login
```

### Scenario 6: Token Expiry

```
Step 1: Login successfully
Step 2: Wait for accessToken to expire
Step 3: Make any API request
Expected: Auto-refresh and request succeeds
```

### Scenario 7: Invalid Credentials

```
Step 1: Go to /login
Step 2: Enter wrong password
Step 3: Submit
Expected: Error message displayed
```

### Scenario 8: Validation Errors

```
Step 1: Go to /register
Step 2: Enter non-matching passwords
Step 3: Submit
Expected: Error: "Passwords do not match"
```

## Debugging Tips

### Check localStorage
```javascript
// In browser console
localStorage.getItem('accessToken')
localStorage.getItem('refreshToken')
localStorage.getItem('user')
```

### Check Auth State
```typescript
import { useAuth } from '@/hooks/useAuth';

export function DebugComponent() {
  const auth = useAuth();
  console.log('Auth state:', auth);
  return <div>Check console</div>;
}
```

### Monitor Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Perform login/register
4. Check requests and responses
5. Verify token is in Authorization header

### Monitor LocalStorage
1. Open DevTools (F12)
2. Go to Application tab
3. Click Local Storage
4. Select http://localhost:5173
5. Watch tokens update on login/logout

## Common Issues & Solutions

### Issue: "Cannot read property 'data' of undefined"
**Cause**: Response interceptor error handling
**Solution**: Check backend is running and responding correctly

### Issue: "Token not being refreshed"
**Cause**: Missing refresh token in localStorage
**Solution**: Verify backend returns refreshToken on login

### Issue: "Logged out unexpectedly"
**Cause**: Refresh token expired
**Solution**: Increase refresh token expiry in backend

### Issue: "CORS error"
**Cause**: Backend CORS not configured
**Solution**: Ensure NestJS has CORS enabled for frontend URL

### Issue: "localStorage not working"
**Cause**: Browser storage disabled or private mode
**Solution**: Clear browser cache, disable private mode

## Performance Optimization

### Already Implemented

✅ Code splitting with Vite
✅ Lazy component loading with React Router
✅ Memoized hook returns
✅ Efficient context updates
✅ Request queuing to reduce API calls
✅ CSS in separate files for caching

### Optional Enhancements

- [ ] Add Redux for complex state
- [ ] Implement request caching
- [ ] Add offline support with service workers
- [ ] Implement analytics tracking
- [ ] Add error boundary components

## Production Checklist

Before deploying to production:

- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Enable HTTPS for all requests
- [ ] Set secure cookie flags for tokens
- [ ] Implement CSRF protection
- [ ] Add rate limiting for auth endpoints
- [ ] Enable request logging and monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Test token refresh in production
- [ ] Test logout functionality
- [ ] Verify protected routes work correctly
- [ ] Test error handling and edge cases
- [ ] Run security audit
- [ ] Test on multiple browsers

## Additional Resources

- [Axios Interceptors](https://axios-http.com/docs/interceptors)
- [React Context API](https://react.dev/reference/react/useContext)
- [React Router v6](https://reactrouter.com/en/main)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [TypeScript React](https://www.typescriptlang.org/docs/handbook/react.html)
- [Vite Configuration](https://vitejs.dev/config/)

## Support & Help

For issues or questions:

1. Check browser console for errors
2. Check Network tab for API responses
3. Verify backend is running
4. Check environment variables
5. Review INTEGRATION_GUIDE.md
6. Check logs in browser DevTools
