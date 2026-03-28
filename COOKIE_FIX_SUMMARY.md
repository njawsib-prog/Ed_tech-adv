# Cookie Settings Fix for Cross-Origin Authentication

## Problem
The login redirect issue occurred because cookies set during login were not being sent on subsequent requests in Railway deployment with separate frontend/backend domains. The original cookie settings used `sameSite: 'lax'`, which blocks cross-origin cookies, preventing proper authentication flow.

## Solution
Updated cookie settings to use `sameSite: 'none'` and `secure: true` for cross-origin scenarios, while maintaining compatibility with local development using `sameSite: 'lax'` for localhost.

## Changes Made

### 1. Backend Auth Controller (`backend/src/controllers/auth.controller.ts`)

#### Admin Login Function (lines 62-81)
- **Before**: Static cookie settings with `sameSite: 'lax'` and conditional `secure` flag
- **After**: Dynamic cookie options based on request origin
  - Detects localhost/127.0.0.1 from `req.headers.origin`
  - Uses `sameSite: 'lax'` for localhost
  - Uses `sameSite: 'none'` for all other origins (production/ Railway)
  - Sets `secure: true` for non-localhost or production environments
  - Added debug logging with token prefix and cookie options

#### Student Login Function (lines 145-164)
- Same changes as Admin Login
- Dynamic cookie options based on origin
- Debug logging for troubleshooting

#### Logout Function (lines 186-205)
- **Before**: Static clearCookie settings matching old login settings
- **After**: Dynamic clearCookie options matching new login settings
- Ensures cookies can be properly cleared in both environments
- Debug logging for troubleshooting

#### Get Current User Function (lines 208-223)
- Added debug logging to track token presence and middleware data
- Logs cookie token presence and user info from auth middleware

### 2. Backend Auth Middleware (`backend/src/middleware/authMiddleware.ts`)

#### Auth Middleware Function (lines 9-45)
- Added comprehensive debug logging
- Logs path, method, and cookie presence
- Logs token verification results
- Logs all available cookies
- Helps diagnose authentication flow issues

## Cookie Options Logic

```typescript
const origin = req.headers.origin;
const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1');
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || !isLocalhost,
  sameSite: isLocalhost ? 'lax' : ('none' as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
```

### Local Development
- `sameSite: 'lax'` - Allows cookies for same-site and top-level navigations
- `secure: false` - Works with HTTP (localhost)
- Compatible with both HTTP and HTTPS on localhost

### Production (Railway)
- `sameSite: 'none'` - Allows cookies to be sent on cross-origin requests
- `secure: true` - Requires HTTPS (already enforced by Railway)
- Enables authentication across separate frontend/backend domains

## Important Notes

### HTTPS Requirement
- `sameSite: 'none'` requires `secure: true` (browser enforced)
- Production deployments must use HTTPS (Railway provides this automatically)
- Local development can use HTTP (localhost detection)

### Browser Compatibility
- `sameSite: 'none'` with `secure: true` supported in all modern browsers
- Older browsers that don't support `sameSite` will ignore it gracefully

### CORS Configuration
The backend already has correct CORS settings in `index.ts`:
```typescript
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
```

Ensure `NEXT_PUBLIC_BASE_URL` environment variable matches the actual frontend URL exactly.

### Frontend Configuration
The frontend already uses `withCredentials: true` in `apiClient.ts`:
```typescript
export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

## Debug Logging

Added comprehensive logging throughout the authentication flow:

1. **Login Controllers**: Log cookie options and token prefix
2. **Logout**: Log cookie clearing options
3. **Get Current User**: Log user data from middleware
4. **Auth Middleware**: Log authentication checks, token presence, and verification

These logs will help diagnose any remaining authentication issues in production.

## Security Considerations

- `sameSite: 'none'` allows cookies on any cross-origin request, which is necessary for this architecture
- JWT tokens in httpOnly cookies provide CSRF protection
- The middleware validates tokens on every protected request
- Consider implementing additional CSRF protection if needed

## Testing

After deployment, verify:
1. Login works on production domains
2. Cookie is set correctly (check browser DevTools → Application → Cookies)
3. Subsequent requests include the cookie
4. getCurrentUser endpoint returns user data
5. Logout clears the cookie properly

Check backend logs for:
- `[Auth]` prefix from auth controller
- `[AuthMiddleware]` prefix from middleware
- Cookie option values matching your environment
