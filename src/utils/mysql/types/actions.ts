import { PoolConnection } from 'mysql2/promise';

export interface ISqlCondMap {
    [key: string]: any;
}

export interface IMysqlActions {
    /**
     * Insert a single row into the specified table
     * @param table - The table name
     * @param obj - The object containing column names and values
     */
    insertOne(table: string, obj: ISqlCondMap): Promise<void>;

    /**
     * Insert multiple rows into the specified table
     * @param table - The table name
     * @param obj - The object containing column names and values
     */
    insertMany(table: string, obj: ISqlCondMap): Promise<void>;

    /**
     * Update a single row in the specified table
     * @param table - The table name
     * @param conditions - The WHERE conditions
     * @param obj - The object containing column names and new values
     */
    updateOne(table: string, conditions: ISqlCondMap, obj: any): Promise<void>;

    /**
     * Update multiple rows in the specified table
     * @param table - The table name
     * @param conditions - The WHERE conditions
     * @param obj - The object containing column names and new values
     */
    updateMany(table: string, conditions: ISqlCondMap, obj: any): Promise<void>;

    /**
     * Delete rows from the specified table
     * @param table - The table name
     * @param conditions - The WHERE conditions
     * @param values - Optional parameter values for prepared statements
     */
    deleteFrom(table: string, conditions: ISqlCondMap, values?: any[]): Promise<void>;

    /**
     * Execute a SELECT query
     * @param sql - The SQL query string
     * @param options - Optional parameters for the query
     */
    selectBySql(sql: string, ...options: any[]): Promise<any[]>;

    /**
     * Execute any SQL query
     * @param params - The SQL query and its parameters
     */
    execute(...params: any[]): Promise<any>;
} 