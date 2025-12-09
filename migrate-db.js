#!/usr/bin/env node
/**
 * Database migration script to add UNIQUE constraint and remove duplicates
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'portaal.db');
console.log(`Migrating database: ${dbPath}`);

const db = new Database(dbPath);

try {
    console.log('\n📊 Starting migration...\n');

    // Stap 1: Backup maken
    console.log('1️⃣  Creating backup table...');
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects_backup AS 
    SELECT * FROM projects
  `);
    console.log('   ✅ Backup created');

    // Stap 2: Verwijder duplicaten (behoud oudste entry per directory_path)
    console.log('\n2️⃣  Removing duplicates...');
    const duplicates = db.prepare(`
    SELECT directory_path, COUNT(*) as count
    FROM projects
    GROUP BY directory_path
    HAVING count > 1
  `).all();

    console.log(`   Found ${duplicates.length} duplicate paths`);

    for (const dup of duplicates) {
        console.log(`   - ${dup.directory_path} (${dup.count} entries)`);

        // Behoud alleen de oudste (laagste id)
        db.prepare(`
      DELETE FROM projects
      WHERE directory_path = ?
      AND id NOT IN (
        SELECT MIN(id)
        FROM projects
        WHERE directory_path = ?
      )
    `).run(dup.directory_path, dup.directory_path);
    }
    console.log('   ✅ Duplicates removed');

    // Stap 3: Nieuwe tabel maken met UNIQUE constraint
    console.log('\n3️⃣  Creating new table with UNIQUE constraint...');
    db.exec(`
    DROP TABLE IF EXISTS projects_new
  `);

    db.exec(`
    CREATE TABLE projects_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      directory_path TEXT NOT NULL UNIQUE,
      port INTEGER NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      setup_type TEXT,
      urls TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
    console.log('   ✅ New table created');

    // Stap 4: Data kopiëren
    console.log('\n4️⃣  Copying data to new table...');
    db.exec(`
    INSERT INTO projects_new 
    SELECT * FROM projects
  `);
    const count = db.prepare('SELECT COUNT(*) as count FROM projects_new').get();
    console.log(`   ✅ Copied ${count.count} projects`);

    // Stap 5: Wissel tabellen
    console.log('\n5️⃣  Replacing old table...');
    db.exec(`DROP TABLE projects`);
    db.exec(`ALTER TABLE projects_new RENAME TO projects`);
    console.log('   ✅ Table replaced');

    // Stap 6: Toon resultaat
    console.log('\n6️⃣  Final counts:');
    const finalProjects = db.prepare(`
    SELECT name, directory_path, setup_type
    FROM projects
    ORDER BY name
  `).all();

    for (const proj of finalProjects) {
        console.log(`   - ${proj.name} (${proj.setup_type})`);
        console.log(`     ${proj.directory_path}`);
    }

    console.log(`\n   Total: ${finalProjects.length} unique projects`);

    console.log('\n✅ Migration completed successfully!\n');

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nRestoring from backup...');

    try {
        db.exec(`DROP TABLE IF EXISTS projects`);
        db.exec(`ALTER TABLE projects_backup RENAME TO projects`);
        console.log('✅ Restored from backup');
    } catch (restoreError) {
        console.error('❌ Restore failed:', restoreError.message);
        console.error('⚠️  Manual intervention required!');
    }

    process.exit(1);
} finally {
    // Cleanup backup table
    try {
        db.exec(`DROP TABLE IF EXISTS projects_backup`);
    } catch (e) {
        // Ignore cleanup errors
    }

    db.close();
}
