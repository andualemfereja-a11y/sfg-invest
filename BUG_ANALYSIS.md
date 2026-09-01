# 🐛 Bug Analysis: Register & Invest POST Requests

## Problem Summary
Both **register** and **invest** operations write to the database successfully, but the frontend shows an error because the response object is not being handled correctly.

---

## 🔴 Bug #1: `invest-screen.tsx` - handleConfirm() 

**Location:** `components/sfg/invest-screen.tsx:55-64`

```typescript
function handleConfirm() {
  const res = invest(plan, numericAmount)  // ❌ Missing await!
  if (!res.ok) {
    setError(res.error ?? 'Investment failed.')
    setConfirming(false)
    return
  }
  setConfirming(false)
  setDone(true)
}
```

### The Issue:
- `invest()` is an **async function** that returns a `Promise<Result>`
- The code calls it **without `await`**, so `res` becomes a `Promise` object, NOT the actual result
- A `Promise` object doesn't have an `.ok` property, so `res.ok` is `undefined`
- The condition `if (!res.ok)` evaluates to `true` (undefined = falsy), triggering the error path
- **Meanwhile, the database operation completes successfully in the background**

### Fix:
```typescript
async function handleConfirm() {
  const res = await invest(plan, numericAmount)  // ✅ Add await
  if (!res.ok) {
    setError(res.error ?? 'Investment failed.')
    setConfirming(false)
    return
  }
  setConfirming(false)
  setDone(true)
}
```

---

## 🔴 Bug #2: `app/actions/auth.ts` - getSessionAction() return type mismatch

**Location:** `app/actions/auth.ts:204-262`

### The Issue in `registerAction()`:
```typescript
const result = await registerAction(input)  // Returns AuthResult
if (result.ok) {
  const sessionResult = await getSessionAction()
  if (sessionResult.ok && sessionResult.user) {
    setUser(sessionResult.user)  // ✅ This works
    return { ok: true }  // ✅ Correct return
  }
}
return { ok: false, error: result.error }  // ✅ Correct
```

The `registerAction()` works **conditionally**:
- If `result.ok === true`, it waits for `getSessionAction()` and checks `sessionResult.ok`
- If the session fetch fails (even though user was created), it returns `{ ok: false, error: ... }`
- **This causes the "database writes but frontend shows error" symptom**

### Root Cause:
The `registerAction()` function tries to fetch the session **immediately after registration**, but there can be a timing issue or the session fetch might fail due to:
1. **Cookie timing issue** - The cookie set in line 78 might not be read back by `getSessionAction()` immediately
2. **Race condition** - `getSessionAction()` called before cookie is fully set

### The Fix - Ensure session cookie is readable:

In `app/actions/auth.ts`, after setting the cookie, we should verify it was set:

```typescript
// After setting cookie (line 78-84)
const cookieStore = await cookies()
cookieStore.set(SESSION_COOKIE_NAME, token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60,
  path: '/',
})

// ✅ Verify the session can be read back
const verifySession = await prisma.session.findUnique({
  where: { token },
  include: { user: true },
})

if (!verifySession) {
  console.error('❌ Session was not created or cannot be found')
  // Clean up the user
  await prisma.user.delete({ where: { id: user.id } })
  return { ok: false, error: 'Failed to create session. Please try again.' }
}
```

---

## 🟠 Bug #3: Missing `await` in `lib/auth.ts` - `generateSessionToken()`

**Location:** `lib/auth.ts:17-20`

```typescript
export async function generateSessionToken(): Promise<string> {
  // Generate a more reliable session token
  return uuidv4()  // ⚠️ uuidv4() is synchronous, no need for async
}
```

### Issue:
- This function is `async` but `uuidv4()` is synchronous
- It works, but it's misleading - should either be sync or use UUID v4 async library
- Not the root cause, but adds confusion

### Fix:
```typescript
export function generateSessionToken(): string {
  return uuidv4()
}
```

Then update the call:
```typescript
export async function createSession(userId: string): Promise<string> {
  try {
    const token = generateSessionToken()  // ✅ No await needed
    // ... rest of function
  }
}
```

---

## 📋 Summary of Fixes

| Bug | File | Line | Issue | Fix |
|-----|------|------|-------|-----|
| #1 | `components/sfg/invest-screen.tsx` | 56 | Missing `await` on async call | Add `await` to `invest()` call |
| #2 | `app/actions/auth.ts` | 214-226 | Session fetch might fail after registration | Add session verification after cookie set |
| #3 | `lib/auth.ts` | 17 | Unnecessary `async` on sync function | Remove `async`, remove `await` in caller |

---

## Why This Happens

### The Sequence of Events:

**Current (Broken) Flow:**
```
User clicks "Create Account"
  ↓
RegisterForm calls: const res = register(values)
  ↓
AppContext.register() calls: registerAction(input)
  ↓
Server creates user & session
  ↓
Server sets cookie
  ↓
Server calls getSessionAction() to get user
  ↓
getSessionAction() reads cookie ← Cookie might not be set yet!
  ↓
Session lookup fails
  ↓
registerAction() returns { ok: false, error: "..." }
  ↓
Frontend shows error ❌
  ↓
BUT: Database already has the user and session! ✅
```

**The invest screen issue is even simpler:**
```
User clicks "Confirm"
  ↓
handleConfirm() calls: const res = invest(plan, amount)  // No await!
  ↓
res = Promise<Result> (not the actual result)
  ↓
if (!res.ok) → if (!Promise.ok) → if (!undefined) → TRUE
  ↓
Error shown immediately ❌
  ↓
Meanwhile, invest() completes in background and succeeds ✅
```

---

## Testing the Fixes

After applying these fixes:

1. **Test Register:**
   - Fill form and submit
   - Should see success screen
   - User should exist in database
   - Session should be created

2. **Test Invest:**
   - Select plan and amount
   - Click "Confirm"
   - Should see success screen
   - Investment should exist in database
