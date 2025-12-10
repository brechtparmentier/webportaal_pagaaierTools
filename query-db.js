#!/usr/bin/env node
/**
 * Query database to check for duplicates
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'portaal.db');
const db = new Database(dbPath);

console.log('\n📊 Current database contents:\n');

const projects = db.prepare(`
  SELECT id, name, directory_path, enabled
  FROM projects
  ORDER BY directory_path
`).all();

console.log(`Total projects: ${projects.length}\n`);

for (const proj of projects) {
    console.log(`ID: ${proj.id} | ${proj.enabled ? '✅' : '❌'} | ${proj.name}`);
    console.log(`   ${proj.directory_path}\n`);
}

db.close();
