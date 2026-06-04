import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
export const mysqlConfig = {
    host: env.MYSQL_HOST,
    port: env.MYSQL_PORT,
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    multipleStatements: true,
    charset: 'utf8mb4',
};
export const pool = mysql.createPool(mysqlConfig);
export async function createServerConnection() {
    return mysql.createConnection({
        host: env.MYSQL_HOST,
        port: env.MYSQL_PORT,
        user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        multipleStatements: true,
        charset: 'utf8mb4',
    });
}
export async function pingDatabase() {
    const [rows] = await pool.query('SELECT 1 AS ok');
    return rows;
}
