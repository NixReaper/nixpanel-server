import mysql from 'mysql2/promise'
import { config } from '../config.js'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mariadb.host,
      port: config.mariadb.port,
      user: config.mariadb.user,
      password: config.mariadb.password,
      waitForConnections: true,
      connectionLimit: 5,
      multipleStatements: false, // Never allow multiple statements
    })
  }
  return pool
}

/**
 * Create a hosting account database.
 */
export async function createDatabase(
  dbName: string,
  charset = 'utf8mb4',
  collation = 'utf8mb4_unicode_ci'
): Promise<void> {
  validateIdentifier(dbName)
  validateIdentifier(charset)
  validateIdentifier(collation)
  const conn = await getPool().getConnection()
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET ${charset} COLLATE ${collation}`
    )
  } finally {
    conn.release()
  }
}

/**
 * Drop a hosting account database.
 */
export async function dropDatabase(dbName: string): Promise<void> {
  validateIdentifier(dbName)
  const conn = await getPool().getConnection()
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``)
  } finally {
    conn.release()
  }
}

/**
 * Create a MariaDB user for a hosting account database.
 */
export async function createDatabaseUser(
  username: string,
  password: string
): Promise<void> {
  validateIdentifier(username)
  const conn = await getPool().getConnection()
  try {
    await conn.execute(
      `CREATE USER IF NOT EXISTS ?@'localhost' IDENTIFIED BY ?`,
      [username, password]
    )
  } finally {
    conn.release()
  }
}

/**
 * Grant privileges on a database to a user.
 * privileges must be a validated string like 'ALL' or 'SELECT,INSERT,UPDATE,DELETE'.
 */
export async function grantPrivileges(
  dbName: string,
  username: string,
  privileges: string
): Promise<void> {
  validateIdentifier(dbName)
  validateIdentifier(username)
  const safePrivileges = validatePrivileges(privileges)
  const conn = await getPool().getConnection()
  try {
    await conn.query(
      `GRANT ${safePrivileges} ON \`${dbName}\`.* TO ?@'localhost'`,
      [username]
    )
    await conn.query('FLUSH PRIVILEGES')
  } finally {
    conn.release()
  }
}

/**
 * Drop a MariaDB user.
 */
export async function dropDatabaseUser(username: string): Promise<void> {
  validateIdentifier(username)
  const conn = await getPool().getConnection()
  try {
    await conn.execute(`DROP USER IF EXISTS ?@'localhost'`, [username])
    await conn.query('FLUSH PRIVILEGES')
  } finally {
    conn.release()
  }
}

/**
 * Get the size of a database in MB.
 */
export async function getDatabaseSizeMb(dbName: string): Promise<number> {
  validateIdentifier(dbName)
  const conn = await getPool().getConnection()
  try {
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [dbName]
    )
    return rows[0]?.size_mb ?? 0
  } finally {
    conn.release()
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

/**
 * Validate that a database/user identifier only contains safe characters.
 * Prevents identifier injection even when backtick-quoting.
 */
function validateIdentifier(value: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Invalid identifier: ${value}`)
  }
}

/**
 * Validate a privileges string against an allowlist.
 */
function validatePrivileges(privileges: string): string {
  const allowed = new Set([
    'ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE',
    'CREATE', 'DROP', 'INDEX', 'ALTER', 'REFERENCES',
  ])
  const parts = privileges.toUpperCase().split(',').map(p => p.trim())
  for (const part of parts) {
    if (!allowed.has(part)) {
      throw new Error(`Invalid privilege: ${part}`)
    }
  }
  return parts.join(', ')
}
