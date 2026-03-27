# Quick Start - Testing Login with Debugging

## Prerequisites
- Node.js 18+ installed
- Backend and frontend repositories cloned

## Step 1: Start Backend Server

```bash
cd /home/engine/project/backend
npm run dev
```

Expected output:
```
🚀 Server running on port 4000
[Server] Starting queue workers...
```

Verify backend is running:
```bash
curl http://localhost:4000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "environment": "development",
  "SAFE_MODE": false
}
```

## Step 2: Start Frontend Development Server

Open a new terminal:
```bash
cd /home/engine/project/frontend
npm run dev
```

Expected output:
```
▲ Next.js 15.5.14
- Local: http://localhost:3000
```

## Step 3: Open Browser and Enable Console

1. Open browser and navigate to:
   - **Admin login:** http://localhost:3000/admin/login
   - **Student login:** http://localhost:3000

2. Press **F12** to open Developer Tools

3. Go to the **Console** tab

4. Look for initialization logs:
   ```
   [ApiClient] Initializing with API_URL: http://localhost:4000/api
   [ApiClient] NEXT_PUBLIC_API_URL env var: http://localhost:4000/api
   [AuthProvider] Initializing AuthProvider
   [AuthProvider] refreshUser called
   [AuthProvider] No authenticated user found
   ```

## Step 4: Test Login

### Option A: Create Test User in Database

First, create a test admin user via the backend API or database:

```bash
# Example: Create admin via API (adjust as needed)
curl -X POST http://localhost:4000/api/auth/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Admin",
    "email": "admin@test.com",
    "password": "password123"
  }'
```

### Option B: Use Existing Credentials

If you have existing credentials, use those instead.

### Option C: Check Database

Check what users exist in your database:
```bash
cd backend
npm run db:seed
```

## Step 5: Submit Login Form

1. Enter email and password in the login form
2. Click "Sign In" button
3. Watch the console for logs

**Expected successful flow:**
```
[LoginForm] handleSubmit called
[LoginForm] Calling login with { email: 'adm***', role: 'admin' }
[useAuth] Login attempt started { email: 'adm***', role: 'admin' }
[useAuth] Calling API endpoint: /auth/admin/login
[ApiClient Request] { url: 'http://localhost:4000/api/auth/admin/login', method: 'POST', ... }
[ApiClient Response Success] { status: 200, data: { user: { ... } } }
[useAuth] Login successful { user: { ... } }
[LoginForm] Login succeeded, redirecting...
```

**Expected failure flow (example - wrong password):**
```
[LoginForm] handleSubmit called
[LoginForm] Calling login with { email: 'adm***', role: 'admin' }
[useAuth] Login attempt started { email: 'adm***', role: 'admin' }
[useAuth] Calling API endpoint: /auth/admin/login
[ApiClient Request] { url: 'http://localhost:4000/api/auth/admin/login', method: 'POST', ... }
[ApiClient Response Error] { status: 401, data: { error: 'Invalid credentials' } }
[useAuth] Login failed AxiosError { ... }
[LoginForm] Login error: AxiosError { ... }
[LoginForm] Server error: { status: 401, data: { error: 'Invalid credentials' } }
```

## Step 6: Check Network Tab (Alternative Debugging)

1. In Developer Tools, go to **Network** tab
2. Enable **"Preserve log"** (keeps logs after redirects)
3. Filter by "Fetch/XHR"
4. Submit the login form again
5. Click on the `/auth/admin/login` or `/auth/student/login` request
6. Check:
   - **Headers** tab: Request headers and status code
   - **Payload** tab: Request body (email, password, role)
   - **Response** tab: Server response

## Step 7: Troubleshoot Issues

### Issue: "Connection refused"
**Console shows:**
```
[ApiClient Response Error] { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED ...' }
[LoginForm] Connection refused. Is the backend server running?
```

**Fix:**
```bash
# Check if backend is running
curl http://localhost:4000/api/health

# If not running, start it:
cd backend && npm run dev
```

### Issue: "Server not found"
**Console shows:**
```
[ApiClient Response Error] { code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND ...' }
[LoginForm] Server not found. Please check API URL configuration.
```

**Fix:**
```bash
# Check .env.local file
cat /home/engine/project/frontend/.env.local

# Should contain:
# NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Restart frontend after changing .env.local
```

### Issue: "Connection timed out"
**Console shows:**
```
[ApiClient Response Error] { code: 'ETIMEDOUT', message: 'timeout of ...ms exceeded' }
[LoginForm] Connection timed out. Please try again.
```

**Fix:**
- Check network connectivity
- Verify backend server is responsive
- Check for firewall issues

### Issue: No logs appearing
**Possible causes:**
1. JavaScript error before login
2. Form not submitting properly
3. Browser console not visible

**Fix:**
1. Clear console and refresh page
2. Check for red error messages in console
3. Verify AuthProvider is initialized
4. Try typing `console.log('test')` in console to verify it works

### Issue: Request not in Network tab
**This means the request never reached the network layer**

**Fix:**
1. Follow the log chain:
   - Do you see `[LoginForm] handleSubmit called`?
   - Do you see `[useAuth] Login attempt started`?
   - Do you see `[ApiClient Request]`?

2. Check which step is missing and investigate that component

## Step 8: Run Automated Test

```bash
cd /home/engine/project/frontend
./check-api.sh
```

Expected output:
```
🔍 Checking API connectivity...
📍 API URL: http://localhost:4000/api
🏥 Testing /health endpoint...
✅ Backend is running!
Response: { "status": "ok", "timestamp": ..., "environment": "development", "SAFE_MODE": false }
🔐 Testing auth endpoints availability...
✅ Auth endpoints are accessible (HTTP 404)
📋 Summary:
   Frontend URL: http://localhost:3000
   API URL: http://localhost:4000/api
   Backend Health: 200
🎉 API is ready! You can now try logging in.
```

## Step 9: Check Backend Logs

While testing, monitor the backend terminal for incoming requests:

**Expected logs on successful login:**
```
POST /api/auth/admin/login
Admin login attempt: admin@test.com
Login successful
```

**Expected logs on failed login:**
```
POST /api/auth/admin/login
Admin login attempt: admin@test.com
Login failed: Invalid credentials
```

## Step 10: Check Cookies (If Login Fails After Success)

If you can login but immediately get logged out:

1. Go to **Application** tab in Developer Tools
2. Expand **Cookies** → `http://localhost:3000`
3. Look for authentication cookies (e.g., `token`, `connect.sid`)
4. Verify cookies are being set and not immediately cleared

## Summary of Log Messages

### Initialization (Page Load)
```
[ApiClient] Initializing with API_URL: http://localhost:4000/api
[AuthProvider] Initializing AuthProvider
[AuthProvider] Mounting - checking authentication status
[AuthProvider] refreshUser called
[AuthProvider] No authenticated user found
```

### Login Attempt
```
[LoginForm] handleSubmit called
[LoginForm] Calling login with { email: 'adm***', role: 'admin' }
[useAuth] Login attempt started { email: 'adm***', role: 'admin' }
[useAuth] Calling API endpoint: /auth/admin/login
[ApiClient Request] { url: 'http://localhost:4000/api/auth/admin/login', method: 'POST', ... }
```

### Success
```
[ApiClient Response Success] { status: 200, data: { ... } }
[useAuth] Login successful { user: { ... } }
[LoginForm] Login succeeded, redirecting...
```

### Error
```
[ApiClient Response Error] { status: 401, data: { error: '...' } }
[useAuth] Login failed AxiosError { ... }
[LoginForm] Login error: AxiosError { ... }
[LoginForm] Server error: { status: 401, data: { error: '...' } }
```

## Need More Help?

1. Read the full debugging guide: `DEBUGGING_GUIDE.md`
2. Check implementation details: `LOGIN_DEBUGGING_CHANGES.md`
3. Review the code changes in the modified files
4. Test with browser dev tools Network tab

## Disabling Debug Logs

To disable debug logs (e.g., for testing production-like behavior):

Edit `/home/engine/project/frontend/.env.local`:
```bash
NEXT_PUBLIC_DEBUG=false
```

Then restart the frontend development server.
