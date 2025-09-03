import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { appDb } from "@/lib/db";

export async function GET() {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    
    if (isProduction) {
      // Check PostgreSQL schema
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'task'
        ORDER BY column_name
      `;
      
      const indexes = await sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'task'
      `;
      
      return Response.json({
        success: true,
        environment: "production",
        columns: columns.rows,
        indexes: indexes.rows
      });
    } else {
      // Check SQLite schema
      const columns = appDb.prepare("PRAGMA table_info(task)").all();
      const indexes = appDb.prepare("PRAGMA index_list(task)").all();
      
      return Response.json({
        success: true,
        environment: "development",
        columns,
        indexes
      });
    }
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      environment: process.env.NODE_ENV
    }, { status: 500 });
  }
}
