# Health Check System

## Overview

The Better Do It health check system provides comprehensive monitoring and testing of all critical application components. This system was created to catch production bugs before they affect users, particularly focusing on the invite system issues that have been occurring.

## Components

### 1. Health Check Page (`/health`)

**Location**: `app/health/page.tsx`

A comprehensive web interface that tests all system components and provides real-time health monitoring.

**Features**:

- Real-time health status dashboard
- Individual component testing
- Auto-refresh capability (30-second intervals)
- Detailed error reporting
- Performance metrics
- Environment-specific testing

**Tests Performed**:

- Database connectivity
- Authentication system
- Email service configuration
- Task API endpoints
- Partner API endpoints
- Invite API endpoints
- Database schema integrity
- Environment variables
- Invite flow simulation
- Email comparison logic
- Partner relationship integrity
- Task data integrity
- Email deliverability

### 2. Health Check API (`/api/health-check-public`)

**Location**: `app/api/health-check-public/route.ts`

A public programmatic endpoint for automated monitoring and CI/CD integration.

**Features**:

- JSON response format
- HTTP status codes (200 for healthy, 503 for unhealthy)
- Detailed component status
- Performance metrics
- Environment validation
- Data integrity checks

### 3. Invite Flow Testing (`/api/test-invite-flow`)

**Location**: `app/api/test-invite-flow/route.ts`

Comprehensive testing of the invite system to catch the specific bugs that have been occurring.

**Tests**:

- Invite creation permissions
- Invite code generation
- Database invite creation
- Email comparison logic
- Partnership creation logic
- Invite expiration logic
- Database schema consistency

### 4. Email Comparison Testing (`/api/test-email-comparison`)

**Location**: `app/api/test-email-comparison/route.ts`

Specific testing for the email comparison bug that was causing invite acceptance failures.

**Tests**:

- Basic email comparison
- Database email storage and retrieval
- Character encoding issues
- Whitespace and invisible characters
- Case sensitivity
- Database column name consistency
- Real-world email comparison simulation

### 5. Email Deliverability Testing (`/api/test-email-deliverability`)

**Location**: `app/api/test-email-deliverability/route.ts`

Testing for email delivery issues, including the spam folder problem.

**Tests**:

- Environment configuration
- Resend API key validation
- Resend client initialization
- Email domain validation
- Email sending capability
- Email template rendering
- Email service limits
- Email authentication (SPF, DKIM, DMARC)

### 6. Production Test Script

**Location**: `test-invite-flow.ts`

A TypeScript script for testing production invite flow and system health.

**Features**:

- Production endpoint testing
- Invite flow validation
- Email service testing
- Database connectivity checks
- Comprehensive error reporting

## Usage

### Web Interface

1. Navigate to `/health` in your browser
2. Click "Run Health Checks" to start testing
3. Enable auto-refresh for continuous monitoring
4. Review individual test results and error details

### API Endpoints

```bash
# Basic health check (public)
curl https://better-do-it.com/api/health-check-public

# Test production invite flow
npx tsx test-invite-flow.ts

# Test email service configuration
curl https://better-do-it.com/api/test-email-simple
```

### Production Testing

```bash
# Test production invite flow
npx tsx test-invite-flow.ts

# Check production health
curl https://better-do-it.com/api/health-check-public
```

## Identified Issues

### 1. Email Comparison Bug

**Problem**: The invite acceptance system was failing due to email comparison issues between `invite.inviteeemail` and `session.user.email`.

**Root Causes**:

- Case sensitivity differences
- Whitespace handling inconsistencies
- Character encoding issues
- Database column naming inconsistencies (SQLite vs PostgreSQL)

**Solution**: The health check system now tests all these scenarios and provides detailed diagnostics.

### 2. Email Deliverability Issues

**Problem**: Invite emails were going to spam folders.

**Root Causes**:

- Missing or incorrect SPF/DKIM/DMARC records
- Using personal email domains
- Email authentication configuration issues

**Solution**: The health check system validates email configuration and provides warnings for common issues.

### 3. Database Schema Inconsistencies

**Problem**: Differences between SQLite (development) and PostgreSQL (production) column naming.

**Root Causes**:

- SQLite uses camelCase (`inviteeEmail`)
- PostgreSQL uses lowercase (`inviteeemail`)

**Solution**: The health check system validates schema consistency and identifies mismatches.

## Monitoring Strategy

### Development

1. Run health checks before deploying
2. Use the web interface for manual testing
3. Check email comparison tests specifically

### Production

1. Set up automated monitoring using the shell script
2. Integrate with CI/CD pipelines
3. Monitor email deliverability regularly
4. Set up alerts for failed health checks

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Health Check
  run: |
    npx tsx test-invite-flow.ts
    if [ $? -ne 0 ]; then
      echo "Health check failed"
      exit 1
    fi
```

## Troubleshooting

### Common Issues

1. **Health checks failing**: Check environment variables and database connectivity
2. **Email tests failing**: Verify Resend API key and email configuration
3. **Invite flow tests failing**: Check database schema and email comparison logic
4. **Performance issues**: Review database query performance and optimization

### Debug Mode

Enable detailed logging by setting:

```bash
NODE_ENV=development
```

### Manual Testing

1. Use the web interface at `/health`
2. Check individual test results
3. Review error details and suggestions
4. Test specific scenarios manually

## Future Enhancements

1. **Automated Alerting**: Integrate with monitoring services (PagerDuty, Slack)
2. **Performance Baselines**: Track performance metrics over time
3. **Load Testing**: Add stress testing capabilities
4. **Security Testing**: Add security vulnerability scanning
5. **Database Optimization**: Add database performance monitoring
6. **Email Analytics**: Track email delivery rates and bounce rates

## Maintenance

### Regular Tasks

1. **Weekly**: Review health check results and address any warnings
2. **Monthly**: Update test scenarios based on new features
3. **Quarterly**: Review and update monitoring thresholds
4. **As needed**: Add new tests for critical functionality

### Adding New Tests

1. Create new test endpoint in `app/api/`
2. Add test to health check page
3. Update documentation
4. Test in development environment
5. Deploy to production

## Security Considerations

- Health check endpoints require authentication for sensitive tests
- No sensitive data is exposed in health check responses
- Test data is cleaned up after each test run
- Rate limiting should be considered for production use

## Performance Impact

- Health checks are designed to be lightweight
- Database tests use minimal queries
- Email tests are optional and can be disabled
- Caching can be added for frequently accessed data
- Tests run in parallel where possible to minimize total time

