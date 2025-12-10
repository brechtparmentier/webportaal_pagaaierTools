#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'portaal.db');
const db = new Database(dbPath);

console.log('🔄 Migrating database: adding frontend_path column...');

try {
    // Check if column already exists
    const tableInfo = db.pragma('table_info(projects)');
    const hasColumn = tableInfo.some(col => col.name === 'frontend_path');

    if (hasColumn) {
        console.log('✅ Column frontend_path already exists, skipping migration.');
        process.exit(0);
    }

    // Add the column
    db.exec(`ALTER TABLE projects ADD COLUMN frontend_path TEXT DEFAULT '/';`);

    console.log('✅ Migration completed successfully!');
    console.log('   Added frontend_path column to projects table');

} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
