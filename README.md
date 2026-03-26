# EdTech White-Label Platform

A comprehensive, white-label EdTech platform built with modern web technologies. This platform supports multi-institute isolated deployment with complete admin and student panels.

## 🚀 Features

### Admin Panel
- **Dashboard** - Overview of students, courses, tests, and performance metrics
- **Student Management** - CRUD operations, enrollment tracking, bulk import
- **Course Management** - Courses, modules, and subjects organization
- **Test Management** - Create tests, add questions, schedule tests
- **Results & Analytics** - View results, export CSV, test analytics
- **Study Materials** - Upload and manage study materials
- **Notifications** - Broadcast notifications to students
- **Complaints & Feedback** - Review and respond to student submissions
- **Settings** - Institute branding, feature flags, admin management

### Student Panel
- **Dashboard** - Overview of enrolled courses, upcoming tests, recent results
- **My Tests** - View available tests, take tests with timer
- **Results** - View test results with detailed question analysis
- **Study Materials** - Access course materials
- **Notifications** - Receive institute notifications
- **Complaints & Feedback** - Submit and track complaints, give feedback
- **Profile** - Manage profile, change password, view activity log

### Technical Features
- **White-Label Ready** - CSS variables for easy theming
- **Multi-Institute Support** - Isolated data per institute
- **Row Level Security** - PostgreSQL RLS for data isolation
- **Job Queues** - Redis + BullMQ for background tasks
- **Auto-Submit** - Automatic test submission on time expiry
- **Scheduled Publishing** - Automated test publishing
- **JWT Authentication** - Secure httpOnly cookie-based auth

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context + Hooks
- **HTTP Client**: Axios
- **Database Client**: Supabase Client

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Queue**: Redis + BullMQ
- **Auth**: JWT + httpOnly cookies

## 📁 Project Structure

```
edtech-platform/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # App router pages
│   │   │   ├── (admin)/     # Admin panel routes
│   │   │   └── (student)/   # Student panel routes
│   │   ├── components/      # React components
│   │   │   ├── ui/         # UI components
│   │   │   ├── layout/     # Layout components
│   │   │   └── auth/       # Auth components
│   │   ├── lib/            # Utilities
│   │   ├── hooks/          # Custom hooks
│   │   └── context/        # React context
│   ├── public/             # Static assets
│   └── tailwind.config.ts  # Tailwind configuration
│
├── backend/                  # Express backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   │   ├── admin/      # Admin controllers
│   │   │   └── student/    # Student controllers
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── queue/          # Job queue system
│   │   │   └── workers/    # Queue workers
│   │   ├── db/             # Database client
│   │   └── types/          # TypeScript types
│   └── tests/              # Integration tests
│
└── docker-compose.yml       # Docker compose config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase account)
- Redis (for job queues)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd edtech-platform
```

2. Install dependencies:
```bash
# Install all dependencies
npm install

# Or install separately
cd frontend && npm install
cd ../backend && npm install
```

3. Set up environment variables:
```bash
# Copy example env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
```

4. Set up the database:
```bash
# Run the SQL migrations in Supabase SQL editor
# See database schema in docs/database-schema.sql
```

5. Start development servers:
```bash
# Start backend
cd backend
npm run dev

# In another terminal, start frontend
cd frontend
npm run dev
```

### Docker Setup

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (if enabled)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/students` - List students
- `POST /api/admin/students` - Create student
- `GET /api/admin/courses` - List courses
- `POST /api/admin/courses` - Create course
- `GET /api/admin/tests` - List tests
- `POST /api/admin/tests` - Create test
- `GET /api/admin/results` - List results
- `GET /api/admin/results/export` - Export CSV
- `GET /api/admin/materials` - List materials
- `POST /api/admin/materials` - Create material
- `GET /api/admin/notifications` - List notifications
- `POST /api/admin/notifications/broadcast` - Broadcast notification
- `GET /api/admin/complaints` - List complaints
- `GET /api/admin/feedback` - List feedback
- `GET /api/admin/settings` - Get settings

### Student Routes
- `GET /api/student/dashboard` - Student dashboard
- `GET /api/student/tests` - Available tests
- `POST /api/student/tests/:id/start` - Start test
- `POST /api/student/tests/:id/submit` - Submit test
- `GET /api/student/results` - My results
- `GET /api/student/materials` - Study materials
- `GET /api/student/notifications` - My notifications
- `POST /api/student/complaints` - Submit complaint
- `POST /api/student/feedback` - Submit feedback
- `GET /api/student/profile` - Get profile
- `PUT /api/student/profile` - Update profile

## 🎨 White-Label Customization

The platform supports white-label customization through CSS variables. Customize the theme in `frontend/src/app/globals.css`:

```css
:root {
  --primary-50: #f0f9ff;
  --primary-100: #e0f2fe;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;
  --primary-700: #0369a1;
  
  /* Add your brand colors */
}
```

### Institute Configuration
Configure institute branding in `frontend/src/config/institute.config.ts`:

```typescript
export const instituteConfig = {
  name: 'Your Institute Name',
  logo: '/logo.png',
  tagline: 'Your Tagline',
  supportEmail: 'support@institute.com',
  // ...
};
```

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🚢 Deployment

### Railway Deployment

1. Connect your GitHub repository to Railway
2. Add the required environment variables
3. Deploy the backend service
4. Deploy the frontend service

### Docker Deployment

```bash
# Build images
docker build -t edtech-backend ./backend
docker build -t edtech-frontend ./frontend

# Run containers
docker run -p 4000:4000 edtech-backend
docker run -p 3000:3000 edtech-frontend
```

### Environment Variables (Production)

Make sure to set these in your production environment:

- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST` - Redis host
- `JWT_SECRET` - Strong secret for JWT signing
- `NEXT_PUBLIC_BASE_URL` - Frontend URL
- `NEXT_PUBLIC_API_URL` - Backend API URL

## 📄 License

MIT License - feel free to use this for your educational platform.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, please open an issue in the repository or contact the development team.