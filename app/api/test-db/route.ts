import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Test basic database connection
    const result = await sql`SELECT NOW() as current_time`;
    
    return Response.json({
      success: true,
      message: 'Database connection successful',
      timestamp: result.rows[0]?.current_time,
      environment: process.env.NODE_ENV,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      hasAuthUrl: !!process.env.BETTER_AUTH_URL,
      hasPublicAuthUrl: !!process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    return Response.json({
      success: false,
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      hasAuthUrl: !!process.env.BETTER_AUTH_URL,
      hasPublicAuthUrl: !!process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    }, { status: 500 });
  }
}
