# React-NestJS Authentication Integration Guide

This guide explains the complete authentication integration between the React TypeScript frontend and NestJS backend.

## Project Structure

```
src/
├── components/
│   ├── AuthForm.css              # Shared auth form styles
│   ├── Dashboard.tsx             # Protected dashboard component
│   ├── Dashboard.css             # Dashboard styles
│   ├── LoginForm.tsx             # Login form component
│   ├── RegisterForm.tsx          # Registration form component
│   └── ProtectedRoute.tsx        # Route protection wrapper
├── context/
│   └── AuthContext.tsx           # Global auth state management
├── hooks/
│   └── useAuth.ts                # Custom auth hooks
├── pages/
│   ├── Home.tsx                  # Landing page
│   └── Home.css                  # Home page styles
├── services/
│   └── authApi.ts                # API client with axios
├── App.tsx                       # Main app with routing
└── index.css                     # Global styles
```

## Key Features

### 1. API Client (`src/services/authApi.ts`)

The API client handles all authentication requests with built-in features:

- **Automatic Token Refresh**: Intercepts 401 responses and automatically refreshes tokens
- **Request Interceptors**: Adds JWT token to all outgoing requests
- **Response Interceptors**: Handles token refresh and logout on expiry
- **Error Handling**: Standardized error responses with status codes
- **Queue Management**: Queues requests while token is being refreshed

```typescript
// Usage
import { authApi } from '@/services/authApi';

const response = await authApi.register({ email, password });
const loginResp = await authApi.login({ email, password });
await authApi.logout();
```

**Key Methods:**
- `register(payload)` - Create new user account
- `login(payload)` - Authenticate user
- `refresh(refreshToken)` - Refresh access token
- `logout()` - Revoke tokens and logout
- `clearTokens()` - Clear stored tokens
- `getAccessToken()` - Get current access token
- `getRefreshToken()` - Get current refresh token

### 2. Auth Context (`src/context/AuthContext.tsx`)

Global state management for authentication using React Context API:

```typescript
interface AuthContextType {
  user: User | null;              // Current user data
  accessToken: string | null;      // JWT access token
  refreshToken: string | null;     // Refresh token
  loading: boolean;                // Loading state
  error: ApiError | null;          // Error state
  isAuthenticated: boolean;        // Computed auth status
  register(payload): Promise<void>;
  login(payload): Promise<void>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
  clearError(): void;
}
```

**Features:**
- Persistent storage in localStorage
- Auto-initialization on app start
- Centralized error management
- Event-based logout on token expiry
- Type-safe with full TypeScript support

### 3. Custom Hooks

#### `useAuth()`
Access the auth context anywhere in the app:

```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

#### `usePrivateRoute()`
Check authentication status for route protection:

```typescript
const { isAuthenticated, loading } = usePrivateRoute();
```

#### `useAuthForm()`
Handle form submission with validation:

```typescript
const {
  handleLogin,
  handleRegister,
  formError,
  apiError,
  loading
} = useAuthForm();

const success = await handleLogin(email, password);
```

**Validations:**
- Email format validation
- Password minimum length (8 characters)
- Password confirmation matching
- Required field checking

#### `useTokenRefresh()`
Manual token refresh management:

```typescript
const { refreshTokens, isRefreshing, refreshError } = useTokenRefresh();
await refreshTokens();
```

### 4. Protected Routes

Wrap components that require authentication:

```typescript
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

Features:
- Automatic redirect to login if not authenticated
- Loading state while checking auth
- Seamless integration with routing

### 5. Components

#### RegisterForm
- Email and password validation
- Password confirmation
- Show/hide password toggle
- Loading states during submission
- Error display
- Navigation to login after success

#### LoginForm
- Email and password inputs
- Remember-me support (via localStorage)
- Show/hide password toggle
- Error handling with detailed messages
- Loading states
- Auto-redirect to dashboard on success

#### Dashboard
- Protected component showing user info
- User ID and email display
- Account creation date
- Logout button
- Session refresh action
- Responsive design

#### ProtectedRoute
- Wraps protected components
- Checks authentication status
- Shows loading state while checking
- Redirects to login if unauthorized

## Token Management

### Storage
- **Access Token**: localStorage with key `accessToken`
- **Refresh Token**: localStorage with key `refreshToken`
- **User Data**: localStorage with key `user` (JSON stringified)

### Refresh Flow

When a 401 response is detected:

1. Check if token refresh is already in progress
2. If not, acquire refresh token from storage
3. Make refresh request to `/api/auth/refresh`
4. Extract new tokens from response
5. Update localStorage and context state
6. Retry the original request with new token
7. If refresh fails, dispatch logout event

### Token Lifecycle

```
Login Success
    ↓
Store accessToken + refreshToken
    ↓
Use accessToken in requests (via interceptor)
    ↓
Token expires
    ↓
Receive 401 response
    ↓
Refresh tokens
    ↓
Store new tokens
    ↓
Retry request with new token
    ↓
If refresh fails → Logout
```

## API Endpoints

All endpoints return the standard response structure:

```typescript
{
  status: number;
  message: string;
  data?: {
    userId?: string;
    email?: string;
    createdAt?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenType?: string;
    expiresIn?: number;
  };
  error?: string;
  timestamp: string;
}
```

### Register
```
POST /api/auth/register
Body: { email: string, password: string }
Response: { userId, email, createdAt }
```

### Login
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { accessToken, refreshToken, tokenType, expiresIn }
```

### Refresh
```
POST /api/auth/refresh
Body: { refreshToken: string }
Response: { accessToken, refreshToken, tokenType, expiresIn }
```

### Logout
```
POST /api/auth/logout
Headers: Authorization: Bearer {accessToken}
Response: { message: "Logout successful" }
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd react-ts-app
npm install
# Dependencies added: axios, react-router-dom
```

### 2. Environment Configuration

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Update with your backend URL:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Backend

```bash
cd backend
npm run dev
# Server runs on http://localhost:3001
```

### 4. Start Frontend

```bash
cd react-ts-app
npm run dev
# App runs on http://localhost:5173
```

## Usage Examples

### Register a User

```typescript
import { useAuthForm } from '@/hooks/useAuth';

function RegisterPage() {
  const { handleRegister, formError, loading } = useAuthForm();
  
  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleRegister(email, password, confirmPassword);
    if (success) {
      // Navigate to dashboard
    }
  };
}
```

### Login

```typescript
import { useAuthForm } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const { handleLogin, apiError } = useAuthForm();
  
  const onSubmit = async (e) => {
    e.preventDefault();
    const success = await handleLogin(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };
}
```

### Access User Info

```typescript
import { useAuth } from '@/hooks/useAuth';

function UserProfile() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return <div>Not logged in</div>;
  
  return (
    <div>
      <h1>{user?.email}</h1>
      <p>User ID: {user?.userId}</p>
    </div>
  );
}
```

### Logout

```typescript
import { useAuth } from '@/hooks/useAuth';

function LogoutButton() {
  const { logout, loading } = useAuth();
  
  return (
    <button onClick={logout} disabled={loading}>
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
```

### Protect Routes

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Dashboard } from '@/pages/Dashboard';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginForm />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

## Error Handling

The system handles various error scenarios:

### Network Errors
- Displayed as "Network error" or specific axios error message
- User can retry operations

### Validation Errors
- Email format validation on client side
- Password requirements checked before submission
- Backend validation errors displayed to user

### Token Errors
- Invalid refresh token → Auto-logout
- Expired refresh token → Auto-logout
- Missing tokens → Redirect to login

### HTTP Errors
- 401 Unauthorized → Auto token refresh or logout
- 400 Bad Request → Display error message
- 500 Server Error → Display server error message

## Security Features

✅ **JWT-based Authentication** - Tokens stored securely in localStorage
✅ **Automatic Token Refresh** - Seamless token management
✅ **Protected Routes** - Unauthorized access prevention
✅ **Request Interceptors** - Automatic token injection
✅ **Response Interceptors** - Automatic token refresh on 401
✅ **Logout on Expiry** - Automatic logout when tokens expire
✅ **CORS Support** - Cross-origin requests handled
✅ **Error Handling** - Comprehensive error management

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Requires ES2020 support

## Performance

- **Lazy Loading**: Components lazy-loaded with React Router
- **Code Splitting**: Automatic with Vite
- **CSS** Bundled and minified
- **Token Refresh**: Queued and deduplicated

## Troubleshooting

### Tokens not persisting
- Check if localStorage is enabled
- Clear browser cache and localStorage
- Verify API response includes accessToken

### 401 on protected routes
- Check if accessToken is in localStorage
- Verify token hasn't expired
- Try refreshing the page

### CORS errors
- Ensure backend is running on correct port
- Verify CORS is enabled in NestJS backend
- Check `VITE_API_URL` environment variable

### Login/Register fails
- Check backend is running
- Verify email format is valid
- Ensure password meets requirements (8+ chars)
- Check network tab for API errors

## Next Steps

1. **Add Social Auth** - Integrate OAuth providers
2. **Role-Based Access** - Implement user roles
3. **2FA** - Add two-factor authentication
4. **Password Reset** - Implement forgot password flow
5. **User Profile** - Allow profile updates
6. **Session Management** - Track active sessions

## References

- [React Router Documentation](https://reactrouter.com/)
- [Axios Documentation](https://axios-http.com/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NestJS Auth Documentation](https://docs.nestjs.com/security/authentication)
