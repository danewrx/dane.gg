# Frontend Authentication System

This directory contains the complete authentication system for the dane.gg frontend, designed to work seamlessly with the backend API.

## 🔐 **Architecture Overview**

The authentication system follows SvelteKit's recommended patterns and provides:

- **Server-side authentication** via `hooks.server.ts`
- **Client-side state management** via Svelte stores
- **Automatic token refresh** and session management
- **Rate limiting compliance** with backend restrictions
- **Secure cookie handling** for session persistence

## 📁 **File Structure**

```
src/lib/
├── stores/
│   └── auth.ts              # Svelte stores for auth state
├── services/
│   └── auth.ts              # API service for auth operations
├── components/
│   └── LoadingSpinner.svelte # Reusable loading component
└── README.md                # This file

src/hooks.server.ts          # Server-side auth hooks
src/hooks.client.ts          # Client-side auth hooks
src/routes/
├── login/
│   └── +page.svelte         # Login page
├── logout/
│   └── +page.svelte         # Logout page
└── admin/
    ├── +layout.svelte       # Protected admin layout
    ├── +layout.server.ts    # Server-side layout data
    └── +page.svelte         # Admin dashboard
```

## 🚀 **Key Features**

### **1. Authentication Store (`stores/auth.ts`)**
- Centralized state management for user data
- Reactive stores for `user`, `isAuthenticated`, `isLoading`, `error`
- Automatic persistence to localStorage
- Data expiration handling (24 hours)

### **2. Auth Service (`services/auth.ts`)**
- Complete API integration with backend
- Handles all authentication operations:
  - Login with remember me functionality
  - Logout with session cleanup
  - Token refresh and verification
  - Password change
- Automatic error handling and user feedback
- Rate limiting compliance

### **3. Server-side Protection (`hooks.server.ts`)**
- Validates authentication on every request
- Redirects unauthorized users to login
- Preserves redirect URL for post-login navigation
- Supports both session and JWT token authentication

### **4. Client-side Hooks (`hooks.client.ts`)**
- Initializes authentication on app start
- Sets up automatic token refresh (every 30 minutes)
- Handles cross-tab logout synchronization
- Verifies authentication on tab focus

### **5. Protected Routes**
- All `/admin/*` routes are automatically protected
- Server-side redirects for unauthorized access
- Client-side loading states during authentication
- Graceful error handling

## 🔧 **Usage Examples**

### **Login**
```typescript
import { authService } from '$lib/services/auth';

await authService.login({
  username: 'admin',
  password: 'password123',
  rememberMe: true
});
```

### **Check Authentication**
```typescript
import { isAuthenticated, user } from '$lib/stores/auth';

if ($isAuthenticated) {
  console.log('User:', $user);
}
```

### **Logout**
```typescript
import { authService } from '$lib/services/auth';

await authService.logout();
```

### **Protected Component**
```svelte
<script>
  import { isAuthenticated, user } from '$lib/stores/auth';
</script>

{#if $isAuthenticated}
  <p>Welcome, {$user.username}!</p>
{:else}
  <p>Please log in to continue.</p>
{/if}
```

## 🛡️ **Security Features**

- **HTTP-only cookies** for session management
- **JWT tokens** for stateless authentication
- **Automatic token refresh** to maintain sessions
- **Rate limiting compliance** with backend restrictions
- **CSRF protection** via SameSite cookies
- **Secure password handling** (never stored client-side)
- **Session invalidation** on logout
- **Cross-tab synchronization** for security

## 🔄 **Authentication Flow**

1. **User visits `/admin`** → Server checks authentication
2. **If not authenticated** → Redirect to `/login?redirect=/admin`
3. **User logs in** → Backend validates credentials
4. **Backend returns** → User data + session cookie
5. **Frontend stores** → User data in store + localStorage
6. **User accesses** → Protected routes with valid session
7. **Automatic refresh** → Tokens refreshed every 30 minutes
8. **User logs out** → Session destroyed + redirect to login

## ⚙️ **Configuration**

### **Environment Variables**
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=dane.gg
VITE_APP_VERSION=2.0.0
```

### **Backend Integration**
The frontend expects these backend endpoints:
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/verify` - Token verification
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"Redirecting to login..." loop**
   - Check backend API is running
   - Verify `VITE_API_URL` is correct
   - Check browser console for errors

2. **"Token verification failed"**
   - Backend JWT secret may have changed
   - Clear localStorage and login again
   - Check backend logs for JWT errors

3. **Rate limiting errors**
   - Wait for rate limit to reset
   - Check backend rate limiting configuration
   - Implement exponential backoff if needed

### **Debug Mode**
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'auth:*');
```

## 📚 **API Reference**

### **Auth Store Methods**
- `auth.setUser(user)` - Set user data
- `auth.setLoading(boolean)` - Set loading state
- `auth.setError(string)` - Set error message
- `auth.clearError()` - Clear error
- `auth.logout()` - Clear user data
- `auth.init()` - Initialize from localStorage
- `auth.persist(user)` - Save to localStorage

### **Auth Service Methods**
- `authService.login(credentials)` - Login user
- `authService.logout()` - Logout user
- `authService.refreshToken()` - Refresh tokens
- `authService.verifyToken()` - Verify current token
- `authService.getCurrentUser()` - Get user from session
- `authService.changePassword(data)` - Change password
- `authService.checkAuth()` - Check authentication status
- `authService.init()` - Initialize authentication

## 🎯 **Best Practices**

1. **Always use the auth store** for user state
2. **Handle loading states** in UI components
3. **Show appropriate errors** to users
4. **Use server-side protection** for sensitive routes
5. **Implement proper error boundaries** for auth failures
6. **Test authentication flows** thoroughly
7. **Monitor rate limiting** in production
8. **Keep tokens secure** (HTTP-only cookies)

---

This authentication system provides enterprise-grade security while maintaining a smooth user experience. It's designed to scale with your application and integrate seamlessly with your backend API.
