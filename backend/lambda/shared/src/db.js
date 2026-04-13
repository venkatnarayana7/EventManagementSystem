"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbPool = getDbPool;
const pg_1 = require("pg");
const env_1 = require("./env");
let pool;
function getDbPool() {
    if (!pool) {
        pool = new pg_1.Pool({
            host: env_1.env.dbHost,
            port: env_1.env.dbPort,
            database: env_1.env.dbName,
            user: env_1.env.dbUser,
            password: env_1.env.dbPassword,
            max: 4,
            idleTimeoutMillis: 5_000,
            ssl: env_1.env.appEnv === "prod" ? { rejectUnauthorized: false } : undefined
        });
    }
    return pool;
}
