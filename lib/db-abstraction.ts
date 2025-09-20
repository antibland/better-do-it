/**
 * Database Abstraction Layer
 * 
 * This module provides a bulletproof abstraction layer that automatically
 * handles column name differences between SQLite and PostgreSQL, ensuring
 * that code works identically in both environments without manual mapping.
 */

import { sql } from "@/lib/db-config";
import { appDb } from "@/lib/db";
import { getColumnName } from "@/lib/schema-validator";

// Type definitions for better type safety
export interface QueryBuilder {
  select(columns: string[]): QueryBuilder;
  from(table: string): QueryBuilder;
  where(condition: string, ...params: any[]): QueryBuilder;
  and(condition: string, ...params: any[]): QueryBuilder;
  or(condition: string, ...params: any[]): QueryBuilder;
  orderBy(column: string, direction?: 'ASC' | 'DESC'): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;
  execute(): Promise<any[]>;
  executeOne(): Promise<any>;
}

export interface InsertBuilder {
  into(table: string): InsertBuilder;
  values(data: Record<string, any>): InsertBuilder;
  execute(): Promise<void>;
  executeReturning(returning: string[]): Promise<any>;
}

export interface UpdateBuilder {
  table(table: string): UpdateBuilder;
  set(data: Record<string, any>): UpdateBuilder;
  where(condition: string, ...params: any[]): UpdateBuilder;
  execute(): Promise<void>;
}

export interface DeleteBuilder {
  from(table: string): DeleteBuilder;
  where(condition: string, ...params: any[]): DeleteBuilder;
  execute(): Promise<void>;
}

/**
 * Database abstraction class that handles column name mapping automatically
 */
export class DatabaseAbstraction {
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === "production";
  }

  /**
   * Create a SELECT query builder
   */
  select(columns: string[]): QueryBuilder {
    return new QueryBuilderImpl(this, columns);
  }

  /**
   * Create an INSERT query builder
   */
  insert(): InsertBuilder {
    return new InsertBuilderImpl(this);
  }

  /**
   * Create an UPDATE query builder
   */
  update(): UpdateBuilder {
    return new UpdateBuilderImpl(this);
  }

  /**
   * Create a DELETE query builder
   */
  delete(): DeleteBuilder {
    return new DeleteBuilderImpl(this);
  }

  /**
   * Execute a raw SQL query with automatic column name mapping
   */
  async executeRaw(query: string, params: any[] = []): Promise<any[]> {
    if (this.isProduction) {
      const result = await sql.unsafe(query, params);
      return result.rows || [];
    } else {
      const stmt = appDb.prepare(query);
      return stmt.all(...params);
    }
  }

  /**
   * Execute a raw SQL query and return a single row
   */
  async executeRawOne(query: string, params: any[] = []): Promise<any> {
    if (this.isProduction) {
      const result = await sql.unsafe(query, params);
      return result.rows?.[0] || null;
    } else {
      const stmt = appDb.prepare(query);
      return stmt.get(...params) || null;
    }
  }

  /**
   * Map column names for the current database
   */
  mapColumns(columns: string[]): string[] {
    return columns.map(col => getColumnName(col));
  }

  /**
   * Map a single column name
   */
  mapColumn(column: string): string {
    return getColumnName(column);
  }

  /**
   * Map object keys (for INSERT/UPDATE operations)
   */
  mapObjectKeys(obj: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      mapped[getColumnName(key)] = value;
    }
    return mapped;
  }

  /**
   * Reverse map object keys (for SELECT results)
   */
  reverseMapObjectKeys(obj: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Find the canonical column name
      const canonicalKey = Object.keys(require('@/lib/schema-validator').POSTGRES_COLUMN_MAPPING || {})
        .find(k => getColumnName(k) === key) || key;
      mapped[canonicalKey] = value;
    }
    return mapped;
  }
}

/**
 * Query Builder Implementation
 */
class QueryBuilderImpl implements QueryBuilder {
  private db: DatabaseAbstraction;
  private columns: string[];
  private table?: string;
  private conditions: string[] = [];
  private params: any[] = [];
  private orderByClause?: string;
  private limitClause?: number;
  private offsetClause?: number;

  constructor(db: DatabaseAbstraction, columns: string[]) {
    this.db = db;
    this.columns = columns;
  }

  select(columns: string[]): QueryBuilder {
    this.columns = [...this.columns, ...columns];
    return this;
  }

  from(table: string): QueryBuilder {
    this.table = table;
    return this;
  }

  where(condition: string, ...params: any[]): QueryBuilder {
    this.conditions.push(condition);
    this.params.push(...params);
    return this;
  }

  and(condition: string, ...params: any[]): QueryBuilder {
    this.conditions.push(`AND ${condition}`);
    this.params.push(...params);
    return this;
  }

  or(condition: string, ...params: any[]): QueryBuilder {
    this.conditions.push(`OR ${condition}`);
    this.params.push(...params);
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
    this.orderByClause = `ORDER BY ${this.db.mapColumn(column)} ${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitClause = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetClause = count;
    return this;
  }

  async execute(): Promise<any[]> {
    if (!this.table) {
      throw new Error("Table not specified. Use .from() method.");
    }

    const mappedColumns = this.db.mapColumns(this.columns);
    let query = `SELECT ${mappedColumns.join(', ')} FROM ${this.table}`;

    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' ')}`;
    }

    if (this.orderByClause) {
      query += ` ${this.orderByClause}`;
    }

    if (this.limitClause) {
      query += ` LIMIT ${this.limitClause}`;
    }

    if (this.offsetClause) {
      query += ` OFFSET ${this.offsetClause}`;
    }

    const results = await this.db.executeRaw(query, this.params);
    
    // Reverse map column names in results
    return results.map(row => this.db.reverseMapObjectKeys(row));
  }

  async executeOne(): Promise<any> {
    const results = await this.execute();
    return results[0] || null;
  }
}

/**
 * Insert Builder Implementation
 */
class InsertBuilderImpl implements InsertBuilder {
  private db: DatabaseAbstraction;
  private table?: string;
  private data?: Record<string, any>;

  constructor(db: DatabaseAbstraction) {
    this.db = db;
  }

  into(table: string): InsertBuilder {
    this.table = table;
    return this;
  }

  values(data: Record<string, any>): InsertBuilder {
    this.data = data;
    return this;
  }

  async execute(): Promise<void> {
    if (!this.table || !this.data) {
      throw new Error("Table and data must be specified.");
    }

    const mappedData = this.db.mapObjectKeys(this.data);
    const columns = Object.keys(mappedData);
    const values = Object.values(mappedData);
    const placeholders = this.db.isProduction 
      ? columns.map((_, i) => `$${i + 1}`).join(', ')
      : columns.map(() => '?').join(', ');

    const query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    await this.db.executeRaw(query, values);
  }

  async executeReturning(returning: string[]): Promise<any> {
    if (!this.table || !this.data) {
      throw new Error("Table and data must be specified.");
    }

    const mappedData = this.db.mapObjectKeys(this.data);
    const columns = Object.keys(mappedData);
    const values = Object.values(mappedData);
    const placeholders = this.db.isProduction 
      ? columns.map((_, i) => `$${i + 1}`).join(', ')
      : columns.map(() => '?').join(', ');

    const mappedReturning = this.db.mapColumns(returning);
    const query = `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ${mappedReturning.join(', ')}`;
    
    const result = await this.db.executeRaw(query, values);
    return result[0] ? this.db.reverseMapObjectKeys(result[0]) : null;
  }
}

/**
 * Update Builder Implementation
 */
class UpdateBuilderImpl implements UpdateBuilder {
  private db: DatabaseAbstraction;
  private table?: string;
  private data?: Record<string, any>;
  private conditions: string[] = [];
  private params: any[] = [];

  constructor(db: DatabaseAbstraction) {
    this.db = db;
  }

  table(table: string): UpdateBuilder {
    this.table = table;
    return this;
  }

  set(data: Record<string, any>): UpdateBuilder {
    this.data = data;
    return this;
  }

  where(condition: string, ...params: any[]): UpdateBuilder {
    this.conditions.push(condition);
    this.params.push(...params);
    return this;
  }

  async execute(): Promise<void> {
    if (!this.table || !this.data) {
      throw new Error("Table and data must be specified.");
    }

    const mappedData = this.db.mapObjectKeys(this.data);
    const setClause = Object.keys(mappedData).map((key, i) => {
      const placeholder = this.db.isProduction ? `$${i + 1}` : '?';
      return `${key} = ${placeholder}`;
    }).join(', ');

    const values = Object.values(mappedData);
    let query = `UPDATE ${this.table} SET ${setClause}`;

    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' ')}`;
    }

    await this.db.executeRaw(query, [...values, ...this.params]);
  }
}

/**
 * Delete Builder Implementation
 */
class DeleteBuilderImpl implements DeleteBuilder {
  private db: DatabaseAbstraction;
  private table?: string;
  private conditions: string[] = [];
  private params: any[] = [];

  constructor(db: DatabaseAbstraction) {
    this.db = db;
  }

  from(table: string): DeleteBuilder {
    this.table = table;
    return this;
  }

  where(condition: string, ...params: any[]): DeleteBuilder {
    this.conditions.push(condition);
    this.params.push(...params);
    return this;
  }

  async execute(): Promise<void> {
    if (!this.table) {
      throw new Error("Table must be specified.");
    }

    let query = `DELETE FROM ${this.table}`;

    if (this.conditions.length > 0) {
      query += ` WHERE ${this.conditions.join(' ')}`;
    }

    await this.db.executeRaw(query, this.params);
  }
}

// Export a singleton instance
export const db = new DatabaseAbstraction();

// Export convenience functions
export const select = (columns: string[]) => db.select(columns);
export const insert = () => db.insert();
export const update = () => db.update();
export const deleteFrom = () => db.delete();

// Export commonly used query patterns
export const findUserByEmail = async (email: string) => {
  return await select(['id', 'email', 'name', 'emailVerified', 'createdAt', 'updatedAt'])
    .from('user')
    .where('email = ?', email)
    .executeOne();
};

export const findUserById = async (id: string) => {
  return await select(['id', 'email', 'name', 'emailVerified', 'createdAt', 'updatedAt'])
    .from('user')
    .where('id = ?', id)
    .executeOne();
};

export const findTasksByUserId = async (userId: string) => {
  return await select(['id', 'userId', 'title', 'description', 'completed', 'sortOrder', 'createdAt', 'updatedAt'])
    .from('task')
    .where('userId = ?', userId)
    .orderBy('sortOrder', 'ASC')
    .execute();
};

export const findPartnershipByUserId = async (userId: string) => {
  return await select(['id', 'userA', 'userB', 'createdAt'])
    .from('partnership')
    .where('userA = ? OR userB = ?', userId, userId)
    .executeOne();
};

export const findInviteByCode = async (code: string) => {
  return await select(['id', 'code', 'inviterId', 'inviteeEmail', 'status', 'expiresAt', 'createdAt', 'acceptedAt'])
    .from('invite')
    .where('code = ?', code)
    .executeOne();
};

export const findInvitesByEmail = async (email: string) => {
  return await select(['id', 'code', 'inviterId', 'inviteeEmail', 'status', 'expiresAt', 'createdAt', 'acceptedAt'])
    .from('invite')
    .where('inviteeEmail = ?', email)
    .execute();
};
