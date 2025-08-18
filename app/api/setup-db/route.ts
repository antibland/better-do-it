import { sql } from "@vercel/postgres";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    console.log("Setting up database tables...");
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), "create-tables.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(";")
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        console.log("Executing:", statement.substring(0, 50) + "...");
        await sql.query(statement);
      }
    }
    
    return Response.json({
      success: true,
      message: "Database tables created successfully",
      tablesCreated: ["user", "session", "account", "verification"],
    });
  } catch (error) {
    console.error("Database setup error:", error);
    
    return Response.json({
      success: false,
      message: "Database setup failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
