# Fixla API Documentation
> Base URL: `https://api.fixla.my` atau `https://fixla.my/api`  
> Auth: Bearer JWT Token  
> Content-Type: `application/json`

---

## Auth Endpoints

### POST /api/auth/register/customer
Register customer baru.

**Request:**
```json
{
  "full_name": "Ahmad Ali",
  "phone": "0123456789",
  "email": "ahmad@email.com",
  "password": "password123"
}
```
**Response 201:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "full_name": "Ahmad Ali",
    "role": "customer"
  }
}
```

---

### POST /api/auth/register/provider
Register provider baru.

**Request:**
```json
{
  "full_name": "Ali Repair",
  "phone": "0123456789",
  "email": "ali@email.com",
  "password": "password123",
  "business_name": "Ali Aircond Services"
}
```
**Response 201:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "full_name": "Ali Repair",
    "role": "provider",
    "verification_status": "pending"
  }
}
```

---

### POST /api/auth/login
Login untuk semua user roles.

**Request:**
```json
{
  "phone": "0123456789",
  "password": "password123"
}
```
**Response 200:**
```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "full_name": "Ahmad Ali",
    "role": "customer"
  }
}
```

---

### POST /api/auth/refresh
Refresh JWT token.

**Headers:** `Authorization: Bearer <token>`  
**Response 200:**
```json
{
  "success": true,
  "token": "eyJhbGci..."
}
```

---

### POST /api/auth/logout
Logout & invalidate token.

**Headers:** `Authorization: Bearer <token>`  
**Response 200:**
```json
{ "success": true, "message": "Logged out" }
```

---

## User Endpoints

### GET /api/users/me
Get current user profile.

**Headers:** `Authorization: Bearer <token>`  
**Response 200:**
```json
{
  "id": "uuid",
  "full_name": "Ahmad Ali",
  "phone": "0123456789",
  "email": "ahmad@email.com",
  "role": "customer",
  "avatar_url": "https://...",
  "is_verified": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

---

### PATCH /api/users/me
Update current user profile.

**Request:**
```json
{
  "full_name": "Ahmad Ali Updated",
  "email": "newemail@email.com",
  "avatar_url": "https://cloudinary.com/..."
}
```
**Response 200:**
```json
{ "success": true, "user": { "...updated fields" } }
```

---

### PATCH /api/users/me/password
Change password.

**Request:**
```json
{
  "current_password": "oldpass",
  "new_password": "newpass123"
}
```

---

## Provider Profile Endpoints

### GET /api/providers/profile
Get own provider profile.

**Headers:** `Authorization: Bearer <token>` (role: provider)  
**Response 200:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "business_name": "Ali Aircond",
  "bio": "10 tahun pengalaman...",
  "years_experience": 10,
  "base_address": "Taman Maju, KL",
  "base_lat": 3.1390,
  "base_lng": 101.6869,
  "service_radius_km": 20,
  "is_online": true,
  "verification_status": "verified",
  "rating_avg": 4.8,
  "total_reviews": 42,
  "total_jobs_completed": 56,
  "is_featured": false,
  "categories": [...],
  "documents": [...]
}
```

---

### PATCH /api/providers/profile
Update provider profile.

**Request:**
```json
{
  "business_name": "Ali Aircond Pro",
  "bio": "Updated bio...",
  "years_experience": 11,
  "base_address": "Taman Maju, KL",
  "base_lat": 3.1390,
  "base_lng": 101.6869,
  "service_radius_km": 25
}
```

---

### PATCH /api/providers/status
Toggle online/offline status.

**Request:**
```json
{ "is_online": true }
```
**Response 200:**
```json
{ "success": true, "is_online": true }
```

---

### POST /api/providers/documents
Upload verification documents.

**Content-Type:** `multipart/form-data`  
**Request:**
```
doc_type: "ic_front" | "ic_back" | "selfie" | "ssm" | "cert"
file: <binary>
```
**Response 201:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "doc_type": "ic_front",
    "file_url": "https://cloudinary.com/...",
    "verified": false
  }
}
```

---

### GET /api/providers/nearby
Get providers berdekatan (untuk customer).

**Query Params:**
```
lat=3.1390
lng=101.6869
radius=20          (km, default: 20)
category_id=uuid   (optional)
limit=20
page=1
```
**Response 200:**
```json
{
  "providers": [
    {
      "id": "uuid",
      "business_name": "Ali Aircond",
      "rating_avg": 4.8,
      "total_reviews": 42,
      "distance_km": 2.3,
      "is_online": true,
      "is_featured": false,
      "categories": ["Aircond", "Electrical"],
      "avatar_url": "https://..."
    }
  ],
  "total": 24,
  "page": 1
}
```

---

### GET /api/providers/:id
Get public provider profile.

**Response 200:**
```json
{
  "id": "uuid",
  "business_name": "Ali Aircond",
  "bio": "...",
  "years_experience": 10,
  "rating_avg": 4.8,
  "total_reviews": 42,
  "total_jobs_completed": 56,
  "categories": [...],
  "reviews": [...],
  "is_featured": false,
  "verification_status": "verified"
}
```

---

## Categories Endpoints

### GET /api/categories
Get all service categories.

**Response 200:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Electrical",
      "name_ms": "Elektrikal",
      "slug": "electrical",
      "icon_url": "https://...",
      "subcategories": [
        {
          "id": "uuid",
          "name": "Fan Installation",
          "name_ms": "Pasang Kipas"
        }
      ]
    }
  ]
}
```

---

### GET /api/categories/:slug
Get single category with subcategories.

---

## Job Request Endpoints

### POST /api/jobs
Create job request baru (customer only).

**Request:**
```json
{
  "category_id": "uuid",
  "subcategory_id": "uuid",
  "title": "Aircond tak sejuk",
  "description": "Unit 1.5HP dah 2 hari tak sejuk...",
  "location_address": "No 12, Jalan Maju, Taman Maju",
  "location_lat": 3.1390,
  "location_lng": 101.6869,
  "state": "Selangor",
  "city": "Petaling Jaya",
  "postcode": "47810",
  "urgency": "urgent",
  "preferred_date": "2025-06-01",
  "preferred_time": "morning",
  "budget_min": 80,
  "budget_max": 150
}
```
**Response 201:**
```json
{
  "success": true,
  "job": {
    "id": "uuid",
    "status": "open",
    "expires_at": "2025-06-07T00:00:00Z",
    "...all fields"
  }
}
```

---

### POST /api/jobs/:id/images
Upload gambar untuk job request.

**Content-Type:** `multipart/form-data`  
**Request:** `images: <binary[]>` (max 5 images)  
**Response 201:**
```json
{
  "success": true,
  "images": [
    { "id": "uuid", "image_url": "https://cloudinary.com/..." }
  ]
}
```

---

### GET /api/jobs
Get job list.

**Query Params (customer):**
```
status=open|bidding|assigned|in_progress|completed|cancelled
page=1
limit=10
```
**Query Params (provider):**
```
category_id=uuid
state=Selangor
city=PJ
urgency=urgent
lat=3.1390
lng=101.6869
radius=20
page=1
limit=10
```
**Response 200:**
```json
{
  "jobs": [
    {
      "id": "uuid",
      "title": "Aircond tak sejuk",
      "category": { "name": "Aircond" },
      "location_address": "Taman Maju, PJ",
      "urgency": "urgent",
      "budget_min": 80,
      "budget_max": 150,
      "status": "open",
      "bids_count": 3,
      "distance_km": 1.2,
      "created_at": "2025-05-20T00:00:00Z"
    }
  ],
  "total": 45,
  "page": 1
}
```

---

### GET /api/jobs/:id
Get single job detail.

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Aircond tak sejuk",
  "description": "...",
  "category": { "name": "Aircond" },
  "subcategory": { "name": "Aircond Repair" },
  "location_address": "...",
  "urgency": "urgent",
  "budget_min": 80,
  "budget_max": 150,
  "status": "open",
  "images": [...],
  "bids": [...],
  "customer": { "full_name": "Ahmad", "avatar_url": "..." },
  "created_at": "..."
}
```

---

### PATCH /api/jobs/:id
Update job (customer only, status=open sahaja).

---

### DELETE /api/jobs/:id
Cancel job (customer only, status=open sahaja).

**Response 200:**
```json
{ "success": true, "message": "Job cancelled" }
```

---

### PATCH /api/jobs/:id/complete
Customer mark job as complete.

**Response 200:**
```json
{ "success": true, "status": "completed" }
```

---

## Bids Endpoints

### POST /api/jobs/:id/bids
Provider place bid untuk job.

**Request:**
```json
{
  "proposed_price": 120,
  "estimated_duration": "2-3 jam",
  "message": "Saya boleh datang esok pagi..."
}
```
**Response 201:**
```json
{
  "success": true,
  "bid": {
    "id": "uuid",
    "proposed_price": 120,
    "status": "pending",
    "is_lead_unlocked": false
  }
}
```

---

### GET /api/jobs/:id/bids
Get semua bids untuk sebuah job (customer only).

**Response 200:**
```json
{
  "bids": [
    {
      "id": "uuid",
      "proposed_price": 120,
      "estimated_duration": "2-3 jam",
      "message": "...",
      "status": "pending",
      "provider": {
        "business_name": "Ali Aircond",
        "rating_avg": 4.8,
        "total_reviews": 42,
        "avatar_url": "..."
      },
      "is_lead_unlocked": false
    }
  ]
}
```

---

### PATCH /api/bids/:id/accept
Customer accept bid tertentu.

**Response 200:**
```json
{
  "success": true,
  "assignment": {
    "id": "uuid",
    "agreed_price": 120,
    "status": "assigned"
  }
}
```

---

### PATCH /api/bids/:id/reject
Customer reject bid.

---

### DELETE /api/bids/:id
Provider withdraw bid sendiri.

---

## Assignment Endpoints

### PATCH /api/assignments/:id/start
Provider mark job as started.

**Response 200:**
```json
{ "success": true, "status": "in_progress", "started_at": "..." }
```

---

### PATCH /api/assignments/:id/complete
Provider mark job as complete.

**Response 200:**
```json
{ "success": true, "status": "completed", "completed_at": "..." }
```

---

## Reviews Endpoints

### POST /api/jobs/:id/reviews
Submit review selepas job complete.

**Request:**
```json
{
  "rating": 5,
  "comment": "Kerja cepat dan kemas, sangat puas hati!"
}
```
**Response 201:**
```json
{
  "success": true,
  "review": {
    "id": "uuid",
    "rating": 5,
    "comment": "...",
    "created_at": "..."
  }
}
```

---

### PATCH /api/reviews/:id/response
Provider reply kepada review.

**Request:**
```json
{ "provider_response": "Terima kasih atas kepercayaan anda!" }
```

---

### GET /api/providers/:id/reviews
Get semua reviews untuk provider.

**Query Params:** `page=1&limit=10`  
**Response 200:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "...",
      "provider_response": "...",
      "reviewer": { "full_name": "Ahmad", "avatar_url": "..." },
      "created_at": "..."
    }
  ],
  "rating_avg": 4.8,
  "total": 42
}
```

---

## Messaging Endpoints

### GET /api/conversations
Get semua conversations user.

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "job": { "id": "uuid", "title": "Aircond tak sejuk" },
      "other_party": {
        "full_name": "Ali Repair",
        "avatar_url": "..."
      },
      "last_message": "Ok saya datang pukul 10 pagi",
      "last_message_at": "...",
      "unread_count": 2
    }
  ]
}
```

---

### GET /api/conversations/:id/messages
Get messages dalam conversation.

**Query Params:** `page=1&limit=50`  
**Response 200:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "content": "Ok saya datang pukul 10 pagi",
      "msg_type": "text",
      "is_read": true,
      "created_at": "..."
    }
  ]
}
```

---

### POST /api/conversations/:id/messages
Send message.

**Request:**
```json
{
  "content": "Ok tengok dulu",
  "msg_type": "text"
}
```

---

### POST /api/conversations
Create atau get conversation untuk job+provider.

**Request:**
```json
{
  "job_id": "uuid",
  "provider_id": "uuid"
}
```

---

## Notifications Endpoints

### GET /api/notifications
Get semua notifications.

**Query Params:** `page=1&limit=20&is_read=false`  
**Response 200:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "new_bid",
      "title": "Bid baru untuk job kau",
      "body": "Ali Aircond telah bid RM120 untuk job aircond kau",
      "data": { "job_id": "uuid", "bid_id": "uuid" },
      "is_read": false,
      "created_at": "..."
    }
  ],
  "unread_count": 5
}
```

---

### PATCH /api/notifications/:id/read
Mark notification as read.

---

### PATCH /api/notifications/read-all
Mark all notifications as read.

---

## Admin Endpoints
> Role: admin sahaja

### GET /api/admin/users
Get all users dengan filter.

**Query Params:** `role=provider&is_verified=false&page=1`

---

### PATCH /api/admin/providers/:id/verify
Verify atau reject provider.

**Request:**
```json
{
  "verification_status": "verified",
  "note": "Dokumen lengkap dan sah"
}
```

---

### GET /api/admin/jobs
Get all jobs.

---

### GET /api/admin/stats
Dashboard statistics.

**Response 200:**
```json
{
  "total_users": 1250,
  "total_providers": 342,
  "total_customers": 908,
  "total_jobs": 2341,
  "jobs_completed": 1876,
  "jobs_open": 234,
  "new_users_today": 12,
  "new_jobs_today": 45
}
```

---

## Error Response Format
Semua error guna format yang sama:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token tidak sah atau expired"
  }
}
```

**Error Codes:**
| Code | HTTP Status |
|------|-------------|
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `VALIDATION_ERROR` | 422 |
| `SERVER_ERROR` | 500 |

---

## WebSocket Events (Socket.io)
> Real-time untuk chat dan notifications

### Connection
```js
const socket = io('https://api.fixla.my', {
  auth: { token: 'JWT_TOKEN' }
})
```

### Events — Client emit:
```
join_conversation  { conversation_id }
send_message       { conversation_id, content, msg_type }
typing             { conversation_id }
stop_typing        { conversation_id }
```

### Events — Server emit:
```
new_message        { message object }
new_notification   { notification object }
bid_received       { bid object }
job_status_updated { job_id, status }
user_typing        { conversation_id, user_id }
```

---

## Middleware

```
authenticate     → verify JWT, attach user to req
requireRole      → check user role (customer|provider|admin)
validateRequest  → Zod schema validation
rateLimiter      → 100 req/min per IP
upload           → Multer + Cloudinary
```

---

## Notes untuk Claude Code

1. Guna **UUID** untuk semua primary keys
2. Semua timestamp dalam **ISO 8601 format**
3. Semua amount dalam **MYR (Ringgit Malaysia)**
4. **Pagination** standard: `{ page, limit, total, data[] }`
5. Provider endpoints yang perlukan location — guna **Haversine formula** untuk calculate distance
6. **Rate limiting** — apply pada semua public endpoints
7. **Input validation** — guna Zod untuk semua request body
8. **Error handling** — guna Express global error handler
