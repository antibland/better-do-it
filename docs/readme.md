# Better Do It - Todo App for Partners

A collaborative task management app built with Next.js 15, Better Auth, and dual database support (SQLite for development, PostgreSQL for production).

## 🚀 **Live Demo**

- **Production**: [https://better-do-it.vercel.app](https://better-do-it.vercel.app)
- **Local Development**: [http://localhost:3000](http://localhost:3000)

## ✨ **Features**

- **Task Management**: Create, complete, and organize tasks with drag and drop
- **Partner Collaboration**: Pair with another user to see their active tasks
- **Weekly Goals**: Track completion within Wednesday 6 PM ET week boundaries
- **Active Task Limits**: Maximum 3 active tasks per user
- **Drag and Drop**: Smooth reordering within and between active/master lists
- **Dual Environment**: Works seamlessly in local development and production

## 🛠 **Tech Stack**

- **Framework**: Next.js 15 (App Router)
- **Authentication**: Better Auth
- **Database**:
  - **Local**: SQLite with better-sqlite3
  - **Production**: PostgreSQL (Neon) with @vercel/postgres
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Deployment**: Vercel

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Local Development

```bash
# Clone the repository
git clone https://github.com/antibland/better-do-it.git
cd better-do-it

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

Create a `.env.local` file for local development:

```env
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

## 📖 **Documentation**

- **[Task API Commands](curl-tasks.md)** - Complete cURL cookbook for task operations
- **[Partner API Commands](curl-partners.md)** - Partnership management commands
- **[Useful Commands](useful-commands.md)** - Database, deployment, and debugging commands
- **[Database Troubleshooting](db-troubleshooting.md)** - Common database issues and solutions

## 🔧 **Development Commands**

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx @better-auth/cli generate  # Generate auth migrations
npx @better-auth/cli migrate   # Run auth migrations
```

## 🌐 **Production Deployment**

The app is automatically deployed to Vercel on push to main branch.

### Environment Variables (Production)

- `BETTER_AUTH_SECRET` - Secret key for authentication
- `BETTER_AUTH_URL` - Production auth URL
- `NEXT_PUBLIC_BETTER_AUTH_URL` - Client-side auth URL
- `POSTGRES_URL` - Neon database connection string

## 🗄 **Database Schema**

### Core Tables

- **user** - User accounts and profiles
- **session** - Authentication sessions
- **task** - User tasks with active/master status
- **partnership** - User partnerships for collaboration

### Key Features

- **Dual Database Support**: SQLite (local) ↔ PostgreSQL (production)
- **Data Transformation**: Automatic column name mapping (lowercase ↔ camelCase)
- **Week Boundaries**: Wednesday 6 PM ET completion tracking
- **Active Task Limits**: Maximum 3 active tasks per user

## 🐛 **Troubleshooting**

### Common Issues

1. **Authentication Problems**: Check environment variables and cookie settings
2. **Database Issues**: Verify PostgreSQL connection and table schema
3. **API Errors**: Use the debugging endpoints in the documentation

### Debugging Commands

```bash
# Test database connectivity
curl -s https://better-do-it.vercel.app/api/test-db | jq

# Check authentication setup
curl -s https://better-do-it.vercel.app/api/test-auth | jq

# Verify database schema
curl -s https://better-do-it.vercel.app/api/check-schema | jq
```

## 📝 **API Reference**

### Core Endpoints

- `GET /api/tasks` - List user's tasks
- `POST /api/tasks` - Create new task
- `PATCH /api/tasks/[id]` - Update task (complete, archive, title)
- `DELETE /api/tasks/[id]` - Delete task
- `GET /api/partner` - Get current partner
- `POST /api/partner` - Pair with user by email
- `DELETE /api/partner` - Unpair from current partnership

### Debugging Endpoints

- `GET /api/test-db` - Test database connectivity
- `GET /api/test-auth` - Test authentication setup
- `GET /api/check-schema` - View database schema
- `POST /api/setup-db` - Create database tables

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (local + production)
5. Submit a pull request

## 📄 **License**

This project is open source and available under the [MIT License](LICENSE).

---

**Built with ❤️ for better task management and collaboration**
