/**
 * Update script to re-analyze all projects and update their URLs with port information
 */
const { db, initDatabase, getQueries } = require('./database');
const { analyzeProject } = require('./projectScanner');

// Initialize database
initDatabase();
const queries = getQueries();

console.log('Starting project URL update...\n');

// Get all projects
const projects = queries.getAllProjects.all();

console.log(`Found ${projects.length} projects to analyze\n`);

let updated = 0;
let errors = 0;

for (const project of projects) {
  try {
    console.log(`Analyzing: ${project.name}`);
    console.log(`  Directory: ${project.directory_path}`);

    // Re-analyze the project
    const analysis = analyzeProject(project.directory_path, project.name);

    if (analysis && analysis.urls && analysis.urls.length > 0) {
      // Update the project with new URLs and setup_type
      const urlsJson = JSON.stringify(analysis.urls);

      queries.updateProject.run(
        project.name,
        analysis.description || project.description,
        project.directory_path,
        analysis.ports && analysis.ports.length > 0 ? analysis.ports[0] : project.port,
        project.enabled,
        analysis.setup_type || project.setup_type,
        urlsJson,
        project.id
      );

      console.log(`  ✓ Updated with ${analysis.urls.length} URL(s)`);
      analysis.urls.forEach(url => {
        console.log(`    - ${url.type}: ${url.label} (${url.url})`);
      });
      updated++;
    } else {
      console.log(`  - No changes needed`);
    }
  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    errors++;
  }
  console.log('');
}

console.log('=====================================');
console.log(`Update complete!`);
console.log(`  Updated: ${updated} projects`);
console.log(`  Errors: ${errors}`);
console.log('=====================================');
