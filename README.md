# 🏟️ TurfHub — Multi-Sport Turf Booking Platform

A full-stack, production-ready web application for booking sports turfs. Built with Node.js, Express, MongoDB, and Vanilla JavaScript.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **npm** v8+

### 1. Clone & Install

```bash
cd turfhub/backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
#   MONGODB_URI=mongodb://localhost:27017/turfhub
#   JWT_SECRET=your_super_secret_key_here
#   EMAIL_USER=your_gmail@gmail.com      (optional)
#   EMAIL_PASS=your_app_password         (optional)
```

### 3. Seed Demo Data (Optional)

```bash
node seed.js
```

This creates:
- 👤 Customer: `customer@demo.com` / `demo1234`
- 🏟️ Owner: `owner@demo.com` / `demo1234`
- 3 sample turfs with sports and bookings

### 4. Start Backend

```bash
npm start          # Production
npm run dev        # Development (with auto-reload via nodemon)
```

Server starts at: **http://localhost:5000**

### 5. Open Frontend

Open `index.html` (project root) in your browser, or serve the whole project root:

```bash
# Using VS Code Live Server, or:
npx serve . -p 3000
```

---

## 📁 Project Structure

```
turfhub/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js    # Register, login, password reset
│   │   ├── turfController.js    # Turf CRUD + slot availability
│   │   ├── sportController.js   # Sport management per turf
│   │   ├── bookingController.js # Booking lifecycle (concurrent-safe)
│   │   ├── reviewController.js  # Reviews & ratings
│   │   └── dashboardController.js # Analytics
│   ├── middleware/
│   │   ├── auth.js              # JWT verify + role guard
│   │   ├── upload.js            # Multer image upload
│   │   └── errorHandler.js      # Global error handler
│   ├── models/
│   │   ├── User.js              # Users (customer/owner/admin)
│   │   ├── Turf.js              # Turf venues
│   │   ├── TurfSport.js         # Sports per turf with slot config
│   │   ├── Booking.js           # Bookings with status FSM
│   │   └── Review.js            # Reviews with auto-rating update
│   ├── routes/
│   │   ├── auth.js
│   │   ├── turfs.js
│   │   ├── sports.js
│   │   ├── bookings.js
│   │   ├── reviews.js
│   │   └── dashboard.js
│   ├── utils/
│   │   ├── email.js             # Nodemailer email templates
│   │   └── socket.js            # Socket.IO real-time events
│   ├── uploads/turfs/           # Uploaded turf images
│   ├── seed.js                  # Demo data seeder
│   ├── server.js                # Entry point
│   └── .env.example
│
└── frontend/
    ├── css/
    │   └── style.css            # Full design system (dark/light)
    ├── js/
    │   └── app.js               # API client, Auth, Toast, Navbar, Utils
    ├── pages/
    │   ├── login.html
    │   ├── register.html
    │   ├── forgot-password.html
    │   ├── reset-password.html
    │   ├── turfs.html           # Browse with search + filters
    │   ├── turf-detail.html     # Detail + slot picker + booking
    │   ├── customer-dashboard.html
    │   ├── owner-dashboard.html # Analytics + charts
    │   ├── my-turfs.html        # Owner turf management
    │   ├── add-turf.html        # Create/edit turf with image upload
    │   ├── booking-requests.html # Owner: accept/decline requests
    │   ├── bookings.html        # Customer: booking history
    │   └── profile.html         # Profile + password change
    └── index.html               # Home with hero + featured turfs
```

---

## 🔌 REST API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register (customer/owner) |
| POST | `/api/auth/login` | ❌ | Login → JWT |
| GET  | `/api/auth/me` | ✅ | Get current user |
| PUT  | `/api/auth/profile` | ✅ | Update profile |
| PUT  | `/api/auth/change-password` | ✅ | Change password |
| POST | `/api/auth/forgot-password` | ❌ | Send reset email |
| POST | `/api/auth/reset-password` | ❌ | Reset with token |

### Turfs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/turfs` | ❌ | List (filter by city/sport/search) |
| GET  | `/api/turfs/:id` | ❌ | Get single turf |
| GET  | `/api/turfs/slots?turfSportId=&date=` | ❌ | Available slots |
| GET  | `/api/turfs/owner/my-turfs` | Owner | Owner's turfs |
| POST | `/api/turfs` | Owner | Create turf (multipart) |
| PUT  | `/api/turfs/:id` | Owner | Update turf |
| DELETE | `/api/turfs/:id` | Owner | Soft-delete turf |

### Sports
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/sports/predefined` | ❌ | List predefined sports |
| GET  | `/api/sports/turf/:turfId` | ❌ | Sports for a turf |
| POST | `/api/sports` | Owner | Add sport to turf |
| PUT  | `/api/sports/:id` | Owner | Update sport config |
| DELETE | `/api/sports/:id` | Owner | Remove sport |

### Bookings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/bookings` | Customer | Create booking (concurrent-safe) |
| GET  | `/api/bookings` | ✅ | List (customer: own / owner: turf's) |
| GET  | `/api/bookings/:id` | ✅ | Get single booking |
| PUT  | `/api/bookings/:id/accept` | Owner | Accept booking |
| PUT  | `/api/bookings/:id/decline` | Owner | Decline booking |
| DELETE | `/api/bookings/:id` | Customer | Cancel booking |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/reviews/:turfId` | ❌ | Get turf reviews |
| POST | `/api/reviews` | Customer | Submit review |
| PUT  | `/api/reviews/:id/reply` | Owner | Reply to review |
| DELETE | `/api/reviews/:id` | ✅ | Delete review |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/dashboard/customer` | Customer | Customer stats |
| GET  | `/api/dashboard/owner` | Owner | Owner analytics |

---

## ✨ Key Features

### 🔐 Security
- **JWT** authentication with 7-day expiry
- **bcrypt** password hashing (12 salt rounds)
- Role-based access control (customer / owner / admin)
- **Helmet.js** HTTP security headers
- Rate limiting ready

### ⚡ Concurrent Booking Safety
Bookings use **MongoDB transactions** to prevent double-booking:
```
1. Start session/transaction
2. Lock + check slot availability
3. Create booking atomically
4. Commit or abort on conflict
```
If two users try to book the same slot simultaneously, only one succeeds.

### 📊 Owner Analytics
- Total/Accepted/Declined/Pending bookings count
- **Revenue tracking** with SVG bar chart (last 6 months)
- Sport-wise breakdown with progress bars
- Upcoming bookings table
- Real-time recent activity feed

### 📱 Real-time with Socket.IO
- Owner receives instant notification on new booking
- Customer notified when booking is accepted/declined
- Room-based: each user/owner has a private room

### 📧 Email Notifications (optional)
- Welcome email on registration
- Booking request confirmation
- Booking accepted confirmation
- Password reset link

### 📷 Image Management
- Up to 5 images per turf via Multer
- Drag-and-drop upload UI
- Primary image designation
- Auto-fallback placeholder

---

## 🎨 UI Features
- **Dark / Light theme** — persisted in localStorage
- Fully **responsive** (mobile-first)
- Toast notifications (success/error/warning/info)
- Loading skeletons + spinners
- Animated slot picker
- QR code booking confirmation
- SVG revenue charts (no library needed)

---

## 🧩 Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Real-time | Socket.IO |
| Email | Nodemailer |
| QR Code | qrcode |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| Fonts | Google Fonts (Space Grotesk + Inter) |

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 5000) |
| `MONGODB_URI` | **Yes** | MongoDB connection string |
| `JWT_SECRET` | **Yes** | Secret for JWT signing |
| `JWT_EXPIRE` | No | Token expiry (default: 7d) |
| `EMAIL_HOST` | No | SMTP host for emails |
| `EMAIL_PORT` | No | SMTP port |
| `EMAIL_USER` | No | SMTP user |
| `EMAIL_PASS` | No | SMTP password / app password |
| `FRONTEND_URL` | No | For CORS + email links |
| `MAX_FILE_SIZE` | No | Max upload size in bytes (default: 5MB) |

---

## 📝 Notes

- Email is **optional** — if credentials aren't set, emails are skipped silently
- MongoDB transactions require a **replica set** or Atlas (for concurrent booking safety). For local dev without a replica set, the transaction falls back gracefully.
- The `uploads/` folder is gitignored — ensure it exists on your server

---

*Built with ❤️ for sports lovers · TurfHub 2024*
