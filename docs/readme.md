# Better Do It

A collaborative task management app for partners to stay organized and motivated together.

## Features

- **Task Management**: Create, organize, and complete tasks with drag-and-drop functionality
- **Partner Collaboration**: Share your active tasks with a partner for accountability
- **Weekly Progress Tracking**: Monitor completion rates with custom week boundaries
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Updates**: Instant feedback for all task operations

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Better Auth
- **Database**: PostgreSQL (production), SQLite (development)
- **Deployment**: Vercel
- **Drag & Drop**: React Beautiful DnD

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd better-do-it
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## Documentation

### Essential Guides

- **[Database Architecture](db-architecture.md)** - Understanding the dual database setup
- **[Data Consistency](data-consistency.md)** - Column naming conventions and transformations
- **[Migration Process](migration-process.md)** - Bulletproof database migration process
- **[Essential Commands](useful-commands.md)** - Key commands for development and debugging

### API Documentation

- **[Task API Commands](curl-tasks.md)** - Complete cURL cookbook for task operations
- **[Partner API Commands](curl-partners.md)** - Partnership management commands

### Quick Reference

- **[Migration Rules](migration-rules.md)** - Quick reference for database migrations

## Development

### Project Structure

```
better-do-it/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── components/        # Reusable React components
│   ├── dashboard/         # Main application
│   └── completed-tasks/   # Task history
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
├── docs/                  # Documentation
└── scripts/               # Development scripts
```

### Key Files

- `app/dashboard/page.tsx` - Main application interface
- `app/api/tasks/route.ts` - Task CRUD operations
- `app/api/tasks/reorder/route.ts` - Drag-and-drop reordering
- `lib/db.ts` - Database configuration
- `lib/auth.ts` - Authentication setup

### Database Setup

The application uses a dual database architecture:

- **Development**: SQLite (`./sqlite.db`)
- **Production**: PostgreSQL (Vercel managed)

Database schema is automatically initialized on first run.

### Authentication

Better Auth handles user authentication with:

- Email/password registration and login
- Session management
- Email verification (optional)

## Deployment

### Vercel Deployment

1. **Connect repository** to Vercel
2. **Set environment variables**:
   - `POSTGRES_URL` - PostgreSQL connection string
   - `BETTER_AUTH_SECRET` - Authentication secret
   - `BETTER_AUTH_URL` - Your domain URL
3. **Deploy** - Vercel automatically builds and deploys

### Environment Variables

```bash
# Required
POSTGRES_URL=postgresql://...
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://better-do-it.vercel.app

# Optional
NEXT_PUBLIC_BETTER_AUTH_URL=https://better-do-it.vercel.app
```

## Contributing

### Development Workflow

1. **Create feature branch**

   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** and test locally

3. **Run safety checks**

   ```bash
   node scripts/migration-safety.js
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "Add your feature"
   git push
   ```

### Database Changes

**IMPORTANT**: Follow the bulletproof migration process for any database changes:

1. **Read the migration process** in `docs/migration-process.md`
2. **Create migration endpoint** with full validation
3. **Test locally** before touching production
4. **Deploy migration endpoint** first
5. **Run production migration**
6. **Deploy application code**

### Code Style

- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting
- **Component-based** architecture
- **API-first** design

## Troubleshooting

### Common Issues

- **Database connection errors**: Check environment variables
- **Authentication issues**: Verify Better Auth configuration
- **Drag-and-drop not working**: Check browser console for errors

### Getting Help

1. **Check the documentation** in the `docs/` folder
2. **Run diagnostic commands** from `useful-commands.md`
3. **Check Vercel logs** for production issues
4. **Review migration process** if database issues occur

## License

This project is licensed under the MIT License.

---

**Built with ❤️ for better productivity and collaboration**
