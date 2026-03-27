import pg from "pg";

const { Pool } = pg;

// The pool keeps database access efficient for concurrent API requests.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
