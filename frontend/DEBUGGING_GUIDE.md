# Login API Debugging Guide

This guide helps debug login API request issues in the frontend application.

## What Has Been Added

### 1. Comprehensive Logging
The following files have been enhanced with detailed console logging:

- **`src/lib/apiClient.ts`** - Logs all API requests, responses, and errors
- **`src/hooks/useAuth.tsx`** - Logs authentication flow events
- **`src/components/auth/LoginForm.tsx`** - Logs form submission and error handling

### 2. Environment File
Created `.env.local` file to ensure API URL is properly configured.

## How to Debug Login Issues

### Step 1: Check the Browser Console

1. Open your browser
2. Navigate to the login page
3. Press F12 to open Developer Tools
4. Go to the **Console** tab
5. Look for log messages prefixed with:
   - `[ApiClient]` - API client initialization and requests
   - `[useAuth]` - Authentication hook events
   - `[LoginForm]` - Form submission events
   - `[AuthProvider]` - Auth provider lifecycle events

### Step 2: Common Scenarios

#### Scenario 1: API URL Not Configured

**Console logs:**
```
[ApiClient] Initializing with API_URL: http://localhost:4000/api
[ApiClient] NEXT_PUBLIC_API_URL env var: undefined
```

**Issue:** The environment variable `NEXT_PUBLIC_API_URL` is not set in `.env.local`.

**Solution:**
- Verify `/frontend/.env.local` exists
- Ensure it contains: `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
- Restart the development server after changes

#### Scenario 2: Backend Server Not Running

**Console logs:**
```
[ApiClient Request] { url: 'http://localhost:4000/api/auth/admin/login', method: 'POST', ... }
[ApiClient Response Error] { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED ...' }
[LoginForm] Login error: AxiosError { code: 'ECONNREFUSED', ... }
[LoginForm] Connection refused. Is the backend server running?
```

**Issue:** The backend server is not running or is on a different port.

**Solution:**
- Start the backend server: `cd backend && npm run dev`
- Check if the port (default: 4000) is correct
- Verify the `NEXT_PUBLIC_API_URL` in `.env.local` matches the backend port

#### Scenario 3: Invalid API URL / Server Not Found

**Console logs:**
```
[ApiClient Response Error] { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND ...' }
[LoginForm] Server not found. Please check API URL configuration.
```

**Issue:** The API URL is incorrect or the domain cannot be resolved.

**Solution:**
- Check the `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure the URL is accessible from the browser
- If using a remote server, verify it's running and accessible

#### Scenario 4: Network Timeout

**Console logs:**
```
[ApiClient Response Error] { code: 'ETIMEDOUT', message: 'timeout of ...ms exceeded' }
[LoginForm] Connection timed out. Please try again.
```

**Issue:** Request took too long to complete.

**Solution:**
- Check network connectivity
- Verify the backend server is responsive
- Check if there are firewall/proxy issues

#### Scenario 5: Form Not Submitting

**Console logs:**
- No `[LoginForm] handleSubmit called` message

**Issue:** Form submission handler is not being triggered.

**Solution:**
- Check browser console for JavaScript errors
- Verify the form has `onSubmit={handleSubmit}`
- Check if the button has `type="submit"`
- Look for errors in other components that might prevent execution

#### Scenario 6: API Call Not Made

**Console logs:**
```
[LoginForm] handleSubmit called
[LoginForm] Calling login with { email: '***', role: 'admin' }
[useAuth] Login attempt started
```
But no `[ApiClient Request]` log follows.

**Issue:** The axios call is failing before reaching the network.

**Solution:**
- Check if `apiClient` is properly imported
- Verify the endpoint URL is correct
- Look for errors in the `useAuth` hook

### Step 3: Check Network Tab

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Enable **"Preserve log"** to keep logs after page redirects
4. Submit the login form
5. Look for:
   - The POST request to `/api/auth/admin/login` or `/api/auth/student/login`
   - Status code (200 = success, 401 = unauthorized, 500 = server error)
   - Request/Response headers
   - Request payload (email, password, role)
   - Response data

If you don't see the request in the Network tab, check the Console for errors.

### Step 4: Verify Backend

1. Check if the backend server is running:
   ```bash
   curl http://localhost:4000/api/health
   ```

2. Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": 1234567890,
     "environment": "development",
     "SAFE_MODE": false
   }
   ```

3. Check backend logs for incoming requests:
   - Backend should log: `POST /api/auth/admin/login` or `POST /api/auth/student/login`

### Step 5: Check CORS

If you see CORS errors in the console:
```
Access to XMLHttpRequest at 'http://localhost:4000/api/auth/admin/login'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
- Verify backend CORS configuration allows requests from your frontend origin
- Check backend logs: `backend/src/index.ts` should have:
  ```typescript
  app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
  }));
  ```
- Ensure `config.frontendUrl` matches your frontend URL

### Step 6: Check Cookies

If login succeeds but you're immediately logged out:

1. Check **Application** tab → **Cookies**
2. Look for authentication cookies (e.g., `token`, `connect.sid`)
3. Verify:
   - Cookies are being set
   - Cookie domain/path settings are correct
   - Cookies are not being blocked by browser settings

## Log Message Reference

### ApiClient Logs

- `[ApiClient] Initializing with API_URL: <url>` - API client initialization
- `[ApiClient] NEXT_PUBLIC_API_URL env var: <value>` - Environment variable status
- `[ApiClient Request]` - Outgoing HTTP request (URL, method, headers, data)
- `[ApiClient Response Success]` - Successful HTTP response (status, data)
- `[ApiClient Response Error]` - Failed HTTP request (error details)
- `[ApiClient] 401 Unauthorized, redirecting to login` - Automatic redirect trigger

### useAuth Logs

- `[AuthProvider] Initializing AuthProvider` - Provider component mount
- `[AuthProvider] refreshUser called` - Checking current authentication
- `[AuthProvider] User authenticated` - User found and logged in
- `[AuthProvider] No authenticated user found` - No user session exists
- `[AuthProvider] Rendering with state: <state>` - Current auth state
- `[useAuth] Login attempt started` - Login function called
- `[useAuth] Calling API endpoint: <endpoint>` - About to make API call
- `[useAuth] Login successful` - User authenticated successfully
- `[useAuth] Login failed` - Login attempt failed
- `[useAuth] logout called` - Logout function triggered
- `[useAuth] logout completed` - User logged out

### LoginForm Logs

- `[LoginForm] handleSubmit called` - Form submission handler triggered
- `[LoginForm] Calling login with` - About to call login function
- `[LoginForm] Login succeeded, redirecting...` - Login successful, redirecting
- `[LoginForm] Login error:` - Error occurred during login
- `[LoginForm] Server error:` - Server responded with error status
- `[LoginForm] No response received:` - Network error (no response)
- `[LoginForm] Request setup error:` - Error in request configuration
- `[LoginForm] Non-Axios error:` - Unexpected error type

## Environment Variables

Required environment variables in `/frontend/.env.local`:

```bash
# API Configuration (REQUIRED)
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Other variables (optional for login)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ENABLE_REGISTRATION=true
```

## Testing Checklist

- [ ] Backend server is running (`curl http://localhost:4000/api/health`)
- [ ] Frontend is running (`npm run dev`)
- [ ] `.env.local` file exists with correct `NEXT_PUBLIC_API_URL`
- [ ] Browser console shows `[ApiClient] Initializing with API_URL: http://localhost:4000/api`
- [ ] Submitting the form shows `[LoginForm] handleSubmit called`
- [ ] Login attempt shows `[useAuth] Login attempt started`
- [ ] API request shows `[ApiClient Request]`
- [ ] Network tab shows the POST request
- [ ] Check for CORS errors in console
- [ ] Check for specific error codes (ECONNREFUSED, ENOTFOUND, ETIMEDOUT)

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| ECONNREFUSED | Connection refused | Start backend server, check port |
| ENOTFOUND | Server not found | Verify API URL is correct |
| ETIMEDOUT | Connection timeout | Check network, server responsiveness |
| ERR_NETWORK | Network error | Check connectivity, firewall |
| 401 | Unauthorized | Check credentials |
| 500 | Server error | Check backend logs |

## Removing Debug Logs

After fixing the issue, you can remove the console.log statements by:

1. Removing all `console.log`, `console.error` statements from the modified files
2. Or better, use a conditional logging utility based on an environment variable

Example conditional logger:
```typescript
const DEBUG = process.env.NODE_ENV === 'development';

const debug = {
  log: (...args: any[]) => DEBUG && console.log(...args),
  error: (...args: any[]) => DEBUG && console.error(...args),
};
```

Then replace `console.log` with `debug.log`.
