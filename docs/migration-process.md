# Migration Process

## Overview

This document describes the bulletproof migration system for Better Do It. The system ensures safe, consistent database changes across development and production environments.

## Core Files

- **`lib/migration-system.ts`** - The migration system implementation
- **`test-invite-flow.ts`** - Production testing script

## Migration System

The migration system (`lib/migration-system.ts`) provides:

- **Audit Trail** - Complete logging of all migration activities
- **Rollback Capability** - Safe rollback of failed migrations
- **Dry Run Mode** - Test migrations without execution
- **Validation** - Comprehensive pre and post-migration checks
- **Safety Checks** - Automatic backup and prerequisite validation

## Creating a Migration

1. **Create Migration Endpoint**:

```typescript
// app/api/migrate-[feature]/route.ts
import { migrationSystem, MigrationConfig } from "@/lib/migration-system";
import { NextRequest } from "next/server";

const config: MigrationConfig = {
  name: "add_user_preferences",
  version: "1.0.0",
  description: "Add user preferences table",
  author: "developer@example.com",
  changes: {
    tables: ["user_preferences"],
    columns: ["user.preferences_id"],
    indexes: ["idx_user_preferences_user_id"],
    dataTransforms: [],
  },
  rollbackSteps: ["DROP TABLE user_preferences"],
  prerequisites: ["database_backup"],
  estimatedDuration: 5000,
  riskLevel: "low",
};

export async function POST(req: NextRequest) {
  return migrationSystem.executeMigration(config, req);
}

export async function GET(req: NextRequest) {
  return migrationSystem.getMigrationStatus(config, req);
}
```

2. **Test Migration**:

```bash
npx tsx test-invite-flow.ts
```

3. **Deploy Migration**:

```bash
# Deploy migration endpoint
git add app/api/migrate-[feature]/
git commit -m "Add migration for [feature]"
git push

# Run migration in production
curl -X POST https://better-do-it.com/api/migrate-[feature]
```

## Pre-Deployment Testing

Run the comprehensive test suite before deployment:

```bash
npx tsx test-invite-flow.ts
```

This script tests:

- Production server connectivity
- Database connectivity
- Email service configuration
- Invite flow endpoints
- Schema validation

## Health Monitoring

Monitor system health:

```bash
# Check production health
curl https://better-do-it.com/api/health-check-public

# Visit health dashboard
open https://better-do-it.com/health
```

## Safety Features

- **Automatic Backups** - All migrations create backups
- **Prerequisite Checks** - Validates requirements before execution
- **Rollback Plans** - Automatic rollback capability
- **Audit Logging** - Complete activity tracking
- **Dry Run Mode** - Test without execution

## Best Practices

1. **Always test locally first**
2. **Use dry run mode for complex migrations**
3. **Keep migrations small and focused**
4. **Document all changes clearly**
5. **Test rollback procedures**
6. **Monitor migration execution**

## Emergency Procedures

### Rollback Failed Migration

```bash
# Get migration status
curl https://better-do-it.com/api/migrate-[feature]

# Rollback if needed (automatic on failure)
# Check audit logs for details
```

### Manual Recovery

1. Check migration audit logs
2. Restore from backup if needed
3. Fix underlying issues
4. Re-run migration

## Monitoring

- **Health Checks** - Use `/health` page for system monitoring
- **Audit Logs** - Check migration system logs
- **Database Integrity** - Regular schema validation

## Support

For migration issues:

1. Check the health page: `/health`
2. Review audit logs
3. Test with dry run mode
4. Contact development team
