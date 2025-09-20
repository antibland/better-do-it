# Better Do It - Documentation

## **Database Migration System**

### **Quick Start**

```bash
# Run health checks
npm run dev
# Then visit http://localhost:3000/health

# Test production invite flow
npx tsx test-invite-flow.ts

# Check production health
curl https://better-do-it.com/api/health-check-public
```

### **Migration System**

**CRITICAL: All migrations use the single bulletproof system in `lib/migration-system.ts`**

Key points:

- ✅ **Single source of truth**: All migration functionality in one file
- ✅ Use `/api/migrate-[feature]` endpoints for all database changes
- ✅ Test locally before production with dry-run mode
- ✅ Use the database abstraction layer for column name consistency
- ✅ Comprehensive safety checks and automatic rollback
- ❌ Never create direct SQL migration files
- ❌ Never assume column names are the same across environments

See [`migration-system.md`](./migration-system.md) for the complete guide.

### **Schema Consistency**

The system automatically handles column name differences between SQLite (development) and PostgreSQL (production):

| SQLite (Development) | PostgreSQL (Production) |
| -------------------- | ----------------------- |
| `inviteeEmail`       | `inviteeemail`          |
| `inviterId`          | `inviterid`             |
| `userA`              | `usera`                 |
| `userB`              | `userb`                 |
| `createdAt`          | `createdat`             |
| `updatedAt`          | `updatedat`             |
| `emailVerified`      | `emailverified`         |
| `sortOrder`          | `sortorder`             |

### **Health Check System**

Visit `/health` for comprehensive system monitoring:

- Database connectivity
- Authentication system
- Email service
- API endpoints
- Schema validation
- Invite flow testing
- Email comparison testing
- Partner relationship integrity
- Task data integrity
- Email deliverability

### **Available Scripts**

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run start                  # Start production server
npm run lint                   # Run ESLint

# Testing
npx tsx test-invite-flow.ts    # Test production invite flow
```

### **API Endpoints**

#### **Health & Monitoring**

- `GET /health` - Health check dashboard (public)
- `GET /api/health-check-public` - Public health check API
- `GET /api/test-email-simple` - Test email service configuration

#### **Core Application**

- `POST /api/invites` - Create invite
- `POST /api/invites/accept` - Accept invite
- `GET /api/partner` - Get partner data
- `GET /api/tasks` - Get tasks

### **Database Abstraction**

Use the database abstraction layer for consistent column handling:

```typescript
import { db, select, insert, update, deleteFrom } from "@/lib/db-abstraction";

// Automatic column name mapping
const user = await select(["id", "email", "name", "createdAt"])
  .from("user")
  .where("email = ?", email)
  .executeOne();

// Insert with automatic mapping
await insert()
  .into("invite")
  .values({
    code: "ABC12345",
    inviterId: userId,
    inviteeEmail: email,
    status: "pending",
    expiresAt: new Date(),
  })
  .execute();
```

### **Troubleshooting**

#### **Common Issues**

1. **Schema Inconsistencies**

   ```bash
   # Check production health
   curl https://better-do-it.com/api/health-check-public
   ```

2. **Email Issues**

   ```bash
   # Test email service configuration
   curl https://better-do-it.com/api/test-email-simple
   ```

3. **Invite System Issues**
   ```bash
   # Test invite flow
   npx tsx test-invite-flow.ts
   ```

#### **Emergency Procedures**

See [`migration-process.md`](./migration-process.md) for detailed emergency rollback procedures.

### **Development Workflow**

1. **Before Making Changes**

   ```bash
   npm run dev
   # Visit http://localhost:3000/health
   ```

2. **During Development**
   - Use the database abstraction layer
   - Test locally with SQLite
   - Run health checks regularly

3. **Before Deployment**

   ```bash
   npm run build
   npx tsx test-invite-flow.ts
   ```

4. **After Deployment**
   ```bash
   curl https://better-do-it.com/api/health-check-public
   ```

### **File Structure**

```
docs/
├── README.md                 # This file
├── migration-process.md      # Bulletproof migration process
├── health-check-system.md   # Health check system documentation
└── ...

# Production testing
test-invite-flow.ts          # Production invite flow test

app/api/
├── auth/[...all]/           # Authentication endpoints
├── health-check-public/     # Public health check
├── invites/                 # Invite system
├── partner/                 # Partner management
└── tasks/                   # Task management

lib/
├── migration-system.ts      # Single source of truth for all migrations
├── schema-validator.ts      # Schema validation system
├── db-abstraction.ts        # Database abstraction layer
└── ...
```

### **Support**

For issues or questions:

1. Check the health dashboard at `/health`
2. Run the appropriate validation scripts
3. Review the migration process documentation
4. Check the troubleshooting section above
