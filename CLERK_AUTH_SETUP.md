# Clerk Authentication Setup with Post-Login Profile Configuration

## Overview
Your CV Automation System is now configured with Clerk authentication using Google OAuth, followed by a post-login setup flow to collect user department and role information.

## The Authentication Flow (What You Decided)

```
✅ Frontend gets JWT from Clerk
     ↓
✅ Frontend sends JWT to backend (in Authorization header)
     ↓
✅ Backend verifies JWT with Clerk using Secret Key
     ↓
✅ Backend extracts Clerk user ID from verified JWT
     ↓
✅ Backend saves clerk_user_id + department + role to database
     ↓
✅ Backend gives green light (returns success response)
```

**That's it! The frontend and backend are now linked via Clerk.**

---

### 1. **Clerk Integration**
- Added ClerkProvider to main.tsx to wrap your React app
- Updated environment configuration to use Clerk's publishable key
- Google sign-in is now available through Clerk's SignIn component

### 2. **Authentication Flow**
```
User → Google Sign-In (Clerk) → Setup Profile Form → Dashboard
```

#### Step-by-step process:
1. User clicks "Sign In" on the login page
2. Clerk's SignIn component (with Google OAuth enabled) takes over
3. After successful authentication, user is redirected to `/setup-profile`
4. User selects their department and role
5. Profile data is sent to your backend via `/user/sync` endpoint
6. User is redirected to `/dashboard`

### 3. **Files Modified**

#### **Frontend Changes:**

| File | Changes |
|------|---------|
| `src/main.tsx` | Wrapped app with ClerkProvider |
| `src/App.tsx` | Added SetupUserProfile route |
| `src/pages/Login.tsx` | Replaced email/password with Clerk's SignIn component |
| `src/contexts/AuthContext.tsx` | Updated to use Clerk's useUser() and useClerk() hooks |
| `src/integrations/api/auth.ts` | Simplified to work with Clerk sessions |
| `src/components/ProtectedRoute.tsx` | Added profileSetupComplete check |
| `.env` | Added VITE_CLERK_PUBLISHABLE_KEY |

#### **New File:**
- `src/pages/SetupUserProfile.tsx` - Post-login profile setup form

### 4. **Environment Setup Required**

Update your `.env` file with your Clerk credentials:

```env
# Get these from https://dashboard.clerk.com/
VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key_here"
```

**Steps to get your Clerk key:**
1. Go to https://dashboard.clerk.com/
2. Create an application or select an existing one
3. Go to API Keys
4. Copy the "Publishable Key"
5. Paste it in your `.env` file
6. Make sure Google OAuth is enabled in Clerk dashboard settings

---

## Backend API Endpoints Required

Your backend needs to implement these endpoints. **All requests include a Clerk JWT token in the Authorization header that must be verified.**

### 1. **POST `/user/sync`**

Called after user completes the profile setup form to sync user data with backend.

**Frontend sends:** Clerk JWT + Role & Department

**Request Header:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "role": "student",
  "department": "Mechanical Engineering"
}
```

**Note:** 
- Field names are lowercase: `department` (not `Department`)
- `role` must be exactly `"student"` or `"advisor"` (not `dil_admin`)
- All other user data is extracted from the Clerk JWT by the backend

**Backend Processing:**
1. ✅ **Middleware** verifies JWT with Clerk and injects the current user
2. ✅ **Endpoint receives:**
   - JWT token (via Authorization header middleware)
   - Current `user` object with `clerk_user_id` already extracted
   - Request body with `role` and `department`
3. ✅ **Controller** (`sync_user_preferences_controller`):
   - Receives: db session, clerk_user_id, department, role
   - Saves/syncs user data to database
   - Returns user object
4. ✅ **Give green light** - returns created/updated user object

**Response:**
```json
{
  "user": {
    "id": "user_123...",
    "clerk_user_id": "user_2eF8...",
    "role": "student",
    "department": "Mechanical Engineering",
    "email": "user@example.com",
    "profile_setup_complete": true
  }
}
```

**Backend Code Reference:**
```python
class SyncUserRequest(BaseModel):
    department: str = Field(..., min_length=1, max_length=150)
    role: Literal["student", "advisor"]

@router.post("/user/sync")
async def sync_user_data(
    req: SyncUserRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await sync_user_preferences_controller(
        db=db,
        clerk_user_id=user.clerk_user_id,
        department=req.department,
        role=req.role,
    )
```

### 2. **GET `/users/profile`**

**Frontend sends:** Clerk JWT (to fetch user's profile from database)

**Request Header:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
1. Verify JWT with Clerk using your Secret Key
2. Extract Clerk user ID from verified JWT (`sub` claim)
3. Query database for user with this `clerk_user_id`
4. Return user's profile status and role

**Response:**
```json
{
  "profileSetupComplete": true,
  "role": "student",
  "department": "Department of Mechanical Engineering"
}
```

**When profileSetupComplete is false:**
```json
{
  "profileSetupComplete": false,
  "role": null,
  "department": null
}
```

**Notes:**
- Frontend uses this response to redirect users to `/setup-profile` if needed
- This endpoint is called every time the app loads to check status
- The `role` from this response is stored in frontend context for RBAC

### 3. **GET `/users/:userId/role`**

Called to fetch user's role for role-based access control.

**Request Header:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Backend Processing:**
1. Verify JWT with Clerk
2. Extract Clerk user ID from JWT
3. Query database for user's role

**Response:**
```json
{
  "role": "student"
}
```

---

---

## Complete JWT Flow (frontend → backend)

This is exactly what you described:

```
┌─────────────┐                          ┌────────────┐
│   Frontend  │                          │  Clerk     │
│   (React)   │                          │  Servers   │
└──────┬──────┘                          └────────────┘
       │
       │ 1. User logs in with Google
       ├─────────────────────────────────────────>
       │                                   (Google OAuth)
       │ 2. Clerk returns JWT session
       <─────────────────────────────────────────
       │
       │ 3. Get JWT from session
       │    const token = await session?.getToken()
       │
       │              ┌──────────────┐
       │              │   Backend    │
       │              │   (Your API) │
       │              └──────────────┘
       │                     ▲
       │ 4. Send POST /user/sync
       │    with JWT in Authorization header
       ├────────────────────────────────────────>
       │    Authorization: Bearer <JWT>
       │    Body: { role: "student", department: "..." }
       │
       │    Backend receives request:
       │    ✅ Middleware: Verify JWT → Extract Clerk user ID → Inject user
       │    ✅ Endpoint: Receive (user, role, department)
       │    ✅ Controller: Sync user data to database
       │              - clerk_user_id
       │              - role
       │              - department
       │              - profile_setup_complete = true
       │    ✅ Step 4: Return success (green light)
       │
       │ 5. Backend returns success
       <────────────────────────────────────────
       │    { success: true }
       │
       │ 6. Frontend redirects to /dashboard
       │
```

**Key Points:**
- 🔐 The JWT proves the user is authenticated with Clerk
- 📌 Backend extracts the Clerk user ID from the JWT
- 💾 Database stores: `clerk_user_id` + `department` + `role` (linked together)
- ✅ Next time user loads app, backend can look up user by Clerk ID
- 🛡️ All subsequent requests also include JWT for verification

---

## Backend Setup for JWT Verification

### 1. Get Your Clerk Secret Key
- Go to https://dashboard.clerk.com/
- Navigate to **Deployments** → **API Keys**
- Copy **Secret Key** (starts with `sk_live_` or `sk_test_`)
- Add to your backend `.env`:
  ```
  CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
  ```

### 2. Install Clerk SDK in Your Backend

**Node.js:**
```bash
npm install @clerk/clerk-sdk-node
```

**Python:**
```bash
pip install clerk-sdk-python
```

### 3. Implement JWT Verification

#### Node.js/Express Example:
```typescript
import { clerkClient } from '@clerk/clerk-sdk-node';
import express from 'express';

const app = express();

// Middleware to verify Clerk JWT
async function verifyClerkToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify JWT with Clerk
    const decoded = await clerkClient.verifyToken(token);
    req.clerkUserId = decoded.sub; // Clerk user ID
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Sync user profile endpoint
app.post('/user/sync', verifyClerkToken, async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;
    const { department, role } = req.body;

    // Validate role is only 'student' or 'advisor'
    if (!['student', 'advisor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate department length
    if (!department || department.length < 1 || department.length > 150) {
      return res.status(400).json({ error: 'Invalid department' });
    }

    // Save/sync user to database
    const user = await db.users.create({
      clerk_user_id: clerkUserId,
      department,
      role,
      profile_setup_complete: true,
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync user' });
  }
});
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup profile' });
  }
});

// Get user profile endpoint
app.get('/users/profile', verifyClerkToken, async (req, res) => {
  try {
    const clerkUserId = req.clerkUserId;

    // Find user in database by Clerk ID
    const user = await db.users.findOne({ clerk_user_id: clerkUserId });

    if (!user) {
      return res.json({
        profileSetupComplete: false,
        role: null,
        department: null,
      });
    }

    res.json({
      profileSetupComplete: user.profile_setup_complete,
      role: user.role,
      department: user.department,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
```

#### Python/Flask Example:
```python
from clerk_backend_api import Clerk
from flask import request, jsonify
import os

clerk = Clerk(bearer_token=os.getenv('CLERK_SECRET_KEY'))

def verify_clerk_token():
    """Middleware to verify Clerk JWT"""
    try:
        auth_header = request.headers.get('Authorization', '')
        token = auth_header.replace('Bearer ', '')
        
        if not token:
            return None, 'No token provided', 401

        # Verify JWT with Clerk
        session = clerk.decode_token(token)
        clerk_user_id = session['sub']
        return clerk_user_id, None, None
    except Exception as e:
        return None, 'Invalid token', 401

@app.route('/user/sync', methods=['POST'])
def sync_user_profile():
    clerk_user_id, error, status = verify_clerk_token()
    if error:
        return jsonify({'error': error}), status

    try:
        data = request.json
        department = data.get('department')
        role = data.get('role')
        
        # Validate role is only 'student' or 'advisor'
        if role not in ['student', 'advisor']:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Validate department
        if not department or len(department) < 1 or len(department) > 150:
            return jsonify({'error': 'Invalid department'}), 400
        
        # Save/sync user to database
        user = User(
            clerk_user_id=clerk_user_id,
            department=department,
            role=role,
            profile_setup_complete=True
        )
        db.session.add(user)
        db.session.commit()

        return jsonify({'user': user.to_dict()})
    except Exception as e:
        return jsonify({'error': 'Failed to setup profile'}), 500

@app.route('/users/profile', methods=['GET'])
def get_profile():
    clerk_user_id, error, status = verify_clerk_token()
    if error:
        return jsonify({'error': error}), status

    try:
        # Find user in database by Clerk ID
        user = User.query.filter_by(clerk_user_id=clerk_user_id).first()

        if not user:
            return jsonify({
                'profileSetupComplete': False,
                'role': None,
                'department': None
            })

        return jsonify({
            'profileSetupComplete': user.profile_setup_complete,
            'role': user.role,
            'department': user.department
        })
    except Exception as e:
        return jsonify({'error': 'Failed to fetch profile'}), 500
```

---

## How Authentication Works Now

### On User Login (Clerk handles this)
1. User clicks "Sign In"
2. Clerk's Google OAuth login opens
3. User authenticates with Google
4. Clerk creates a JWT token for the user
5. Frontend gets this JWT from Clerk session

### On Frontend (Your React app)
Every time you need to call the backend:
```typescript
// Get the JWT
const { session } = useClerk();
const token = await session?.getToken({ template: 'default' });

// Send it with your request
await api.post('/user/sync', { role: 'student', department: 'Mechanical Engineering' }, { token });
// Creates header: Authorization: Bearer <JWT>
```

### On Backend (Your API)
Every request arrives with JWT:
1. Extract JWT from `Authorization: Bearer` header
2. Verify it with Clerk using your Secret Key
3. Extract Clerk user ID from verified JWT
4. Use Clerk user ID to look up/create user in your database
5. Process the request

### Protected Routes
- ❌ `/login` - Anyone (not logged in)
- ✅ `/setup-profile` - Logged in users (profile not complete)
- ✅ `/dashboard` - Logged in users (profile complete)
- ✅ `/admin` - Logged in users with `dil_admin` role
- ✅ `/students` - Logged in users with `advisor` or `dil_admin` role

---

## Token Verification (Backend)

Your backend should verify Clerk tokens using Clerk's SDK. Here's an example (pseudo-code):

```python
# Python example with Flask
from clerk_backend_api import Clerk

client = Clerk(bearerToken='YOUR_CLERK_SECRET_KEY')

# In your route handler
token = request.headers.get('Authorization', '').replace('Bearer ', '')
session = client.verify_token(token)
user_id = session.sub
```

---

## Available Departments

The setup form includes these departments:
- Mechanical Engineering
- Electrical Engineering
- Software Engineering
- Civil Engineering
- Chemical Engineering
- Biomedical Engineering
- Other

**To customize:** Edit `src/pages/SetupUserProfile.tsx` and modify the `DEPARTMENTS` import from `@/types/cv`

---

## Available Roles

- `student` - Student users
- `advisor` - Academic advisors
- `dil_admin` - DIL (Department) administrators

These are defined in `src/types/cv.ts` as `type AppRole = 'student' | 'advisor' | 'dil_admin'`

---

## Development Mode

If you have `VITE_ENABLE_DEV_AUTH=true` in your `.env`, you'll see dev login buttons on the login page. This allows quick testing with different roles without using Google OAuth:

```env
VITE_ENABLE_DEV_AUTH=true
```

Click the dev buttons to instantly log in as a specific role for testing (bypasses Clerk and backend).

---

## Testing the Flow

1. Run your frontend: `npm run dev` or `bun dev`
2. Click "Sign In"
3. Use Google OAuth to authenticate
4. Fill in the department and role form (only student/advisor roles work)
5. Verify that your backend receives the `POST /user/sync` request with:
   - Authorization header with Clerk JWT
   - Body: `{ role: "student", department: "..." }`
6. Backend should return user object
7. User should be redirected to dashboard

---

## Troubleshooting

### "VITE_CLERK_PUBLISHABLE_KEY is not set"
- Make sure you've added the key to `.env`
- Make sure it starts with `pk_test_` or `pk_live_`
- Restart your dev server after updating `.env`

### SignIn component not showing
- Verify Clerk key is correct
- Check that Google OAuth is enabled in Clerk dashboard
- Check browser console for errors

### User stuck on setup page or getting errors
- Check backend `POST /user/sync` endpoint is implemented correctly
- Check that JWT verification middleware is working
- Verify token is being sent in Authorization header
- Check browser Network tab to see the actual request and response
- Ensure request body matches spec: `{ role: "student", department: "..." }`
- Verify role is only "student" or "advisor" (not "dil_admin")

### "Invalid role" or "Invalid department" errors
- Frontend should only allow student/advisor roles in the dropdown
- Department must be non-empty and max 150 characters
- Check the exact field names: lowercase `department`, not `Department`

### Profile not loading after setup
- Ensure backend `/users/profile` endpoint is implemented
- Verify it returns `profileSetupComplete: true` after setup
- Check that both responses include the `role` field

---

## Next Steps

1. Add your Clerk publishable key to `.env`
2. Implement the backend endpoints above
3. Test the authentication flow
4. Customize UI as needed
5. Deploy to production

For more info on Clerk: https://clerk.com/docs
