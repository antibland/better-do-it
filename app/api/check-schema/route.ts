import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    // Check what tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    // Check the structure of the user table
    const userColumnsResult = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user' 
      ORDER BY ordinal_position
    `;

    // Check the structure of the task table (if it exists)
    const taskColumnsResult = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'task' 
      ORDER BY ordinal_position
    `;

    // Check the structure of the partnership table (if it exists)
    const partnershipColumnsResult = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'partnership' 
      ORDER BY ordinal_position
    `;

    return Response.json({
      success: true,
      tables: tablesResult.rows,
      userColumns: userColumnsResult.rows,
      taskColumns: taskColumnsResult.rows,
      partnershipColumns: partnershipColumnsResult.rows,
    });
  } catch (error) {
    console.error("Schema check error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
