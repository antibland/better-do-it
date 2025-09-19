# Partnership Invitation System

## Overview

The partnership invitation system allows users to invite others to become their task management partner. Instead of immediate pairing, users now send email invitations that can be accepted by existing or new users.

## How It Works

### 1. Sending Invitations

- Users enter an email address in the Partner section
- The system checks if the email belongs to an existing user or new user
- An invitation is created with a unique 8-character code
- An appropriate email is sent based on user status

### 2. Email Types

#### Existing User Invite

- Sent to users already registered with Better Do It
- Contains a direct link to accept the invitation
- Link format: `/auth?invite_code=ABC12345`

#### New User Invite

- Sent to users not yet registered
- Explains what Better Do It is and its benefits
- Contains a link to sign up and automatically accept the invitation
- Link format: `/auth?invite_code=ABC12345&signup=true`

### 3. Accepting Invitations

- Users click the link in their email
- If not logged in, they're taken to the auth page
- After login/signup, the invitation is automatically accepted
- A partnership is created between the two users

## Database Schema

### `invite` Table

```sql
-- SQLite
CREATE TABLE invite (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  inviterId TEXT NOT NULL,
  inviteeEmail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  acceptedAt TEXT NULL,
  FOREIGN KEY (inviterId) REFERENCES user(id) ON DELETE CASCADE
);

-- PostgreSQL
CREATE TABLE invite (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  inviterid TEXT NOT NULL,
  inviteeemail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expiresat TIMESTAMP WITH TIME ZONE NOT NULL,
  createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  acceptedat TIMESTAMP WITH TIME ZONE NULL
);
```

## API Endpoints

### POST `/api/invites`

Creates a new invitation and sends an email.

**Request:**

```json
{
  "email": "partner@example.com"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Invitation sent to partner@example.com",
  "invite": {
    "id": "invite_123",
    "code": "ABC12345",
    "inviteeEmail": "partner@example.com",
    "status": "pending",
    "expiresAt": "2024-02-15T10:00:00.000Z",
    "createdAt": "2024-01-16T10:00:00.000Z"
  }
}
```

### GET `/api/invites`

Gets pending invitations for the current user.

**Response:**

```json
{
  "success": true,
  "invites": [
    {
      "id": "invite_123",
      "code": "ABC12345",
      "inviterId": "user_456",
      "inviteeEmail": "user@example.com",
      "status": "pending",
      "expiresAt": "2024-02-15T10:00:00.000Z",
      "createdAt": "2024-01-16T10:00:00.000Z",
      "acceptedAt": null,
      "inviterName": "John Doe"
    }
  ]
}
```

### POST `/api/invites/accept`

Accepts an invitation and creates a partnership.

**Request:**

```json
{
  "inviteCode": "ABC12345"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Partnership created successfully!",
  "partnership": {
    "id": "partnership_789",
    "inviterId": "user_456",
    "inviterName": "John Doe",
    "userId": "user_123",
    "userName": "Jane Smith"
  }
}
```

## Environment Variables

Required environment variables for the invite system:

```bash
# Resend API key for sending emails
RESEND_API_KEY=your_resend_api_key_here

# Email configuration
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Better Do It

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
PRODUCTION_APP_URL=https://better-do-it.com
```

## Email Templates

### InviteExistingUserEmail

- **Purpose**: Invite existing users to partner
- **Subject**: `{inviterName} wants to partner with you on Better Do It!`
- **Content**: Brief explanation + accept button + manual link

### InviteNewUserEmail

- **Purpose**: Invite new users to sign up and partner
- **Subject**: `Join Better Do It and partner with {inviterName}!`
- **Content**: App explanation + benefits + signup button + manual link

## Testing

### Development Testing

1. **Email Preview**: Use the "Preview Emails" button in the Partner section
2. **Test Emails**: Use `/api/test-email` endpoint (development only)
3. **Local Testing**: Set up Resend test mode for safe email testing

### Production Testing

1. **Real Emails**: Use actual email addresses for testing
2. **Domain Verification**: Ensure your domain is verified with Resend
3. **Email Deliverability**: Monitor email delivery and bounce rates

## Security Features

- **Invite Code Generation**: 8-character random alphanumeric codes
- **Expiration**: Invitations expire after 30 days
- **User Validation**: Invitations can only be accepted by the intended recipient
- **Status Tracking**: Prevents duplicate acceptances
- **Partnership Validation**: Ensures both users are available for partnership

## Error Handling

### Common Error Scenarios

1. **Invalid Invite Code**: 404 error with clear message
2. **Expired Invitation**: Automatic expiration marking and user notification
3. **Already Partnered**: Prevents multiple partnerships
4. **Email Sending Failure**: Rollback of invitation creation
5. **Database Errors**: Graceful fallback with user-friendly messages

### User Experience

- Clear error messages in the UI
- Automatic cleanup of expired invitations
- Success confirmations for completed actions
- Loading states during API calls

## Migration from Old System

The old immediate pairing system has been replaced with the invitation system:

- **Old**: Direct partnership creation via `/api/partner` POST
- **New**: Invitation creation via `/api/invites` POST, then acceptance via `/api/invites/accept`

The old partner endpoints remain for:

- Getting current partner info (`GET /api/partner`)
- Unpairing from partner (`DELETE /api/partner`)
- Getting partner tasks (`GET /api/partner/tasks`)

## Future Enhancements

- **Bulk Invitations**: Send multiple invitations at once
- **Invitation Management**: View and cancel pending invitations
- **Reminder Emails**: Automatic reminders for pending invitations
- **Analytics**: Track invitation acceptance rates and user engagement
- **Custom Templates**: Allow users to personalize invitation messages
