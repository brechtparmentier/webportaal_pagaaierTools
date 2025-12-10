const fs = require('fs');
const path = require('path');

/**
 * Scant een directory op projecten en analyseert hun setup
 */
function scanDirectory(directoryPath) {
  const projects = [];

  try {
    if (!fs.existsSync(directoryPath)) {
      throw new Error(`Directory does not exist: ${directoryPath}`);
    }

    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const projectPath = path.join(directoryPath, entry.name);
        const projectInfo = analyzeProject(projectPath, entry.name);

        if (projectInfo) {
          projects.push(projectInfo);
        }
      }
    }

    return { success: true, projects };
  } catch (error) {
    return { success: false, error: error.message, projects: [] };
  }
}

/**
 * Analyseert een project directory en detecteert setup type, ports, URLs
 */
function analyzeProject(projectPath, projectName) {
  const info = {
    name: projectName,
    description: '',
    directory_path: projectPath,
    setup_type: 'unknown',
    ports: [],
    urls: []
  };

  // Check voor verschillende config files
  const hasPackageJson = fs.existsSync(path.join(projectPath, 'package.json'));
  const hasDockerCompose = fs.existsSync(path.join(projectPath, 'docker-compose.yml')) ||
    fs.existsSync(path.join(projectPath, 'docker-compose.yaml'));
  const hasDockerfile = fs.existsSync(path.join(projectPath, 'Dockerfile'));
  const hasPm2Config = fs.existsSync(path.join(projectPath, 'ecosystem.config.js')) ||
    fs.existsSync(path.join(projectPath, 'pm2.config.js'));
  const hasRequirements = fs.existsSync(path.join(projectPath, 'requirements.txt'));
  const hasPipfile = fs.existsSync(path.join(projectPath, 'Pipfile'));

  // Analyseer package.json
  if (hasPackageJson) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf-8'));
      info.description = packageJson.description || '';

      // Detecteer framework
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      if (deps.next) {
        info.setup_type = 'nextjs';
      } else if (deps.react) {
        info.setup_type = 'react';
      } else if (deps.vue) {
        info.setup_type = 'vue';
      } else if (deps.express) {
        info.setup_type = 'nodejs-express';
      } else {
        info.setup_type = 'nodejs';
      }

      // Zoek naar port configuratie in scripts
      const scripts = packageJson.scripts || {};
      for (const [scriptName, scriptValue] of Object.entries(scripts)) {
        // Detecteer environment type van script naam
        let envType = 'development';
        if (scriptName.includes('prod')) envType = 'production';
        else if (scriptName.includes('stage') || scriptName.includes('stag')) envType = 'staging';
        else if (scriptName.includes('dev')) envType = 'development';
        else if (scriptName === 'start') envType = 'production';

        // Zoek port in script
        const portMatch = scriptValue.match(/port[=:\s]+(\d+)/i) || scriptValue.match(/--port[=\s]+(\d+)/) || scriptValue.match(/:(\d+)/);
        if (portMatch) {
          const port = parseInt(portMatch[1]);
          if (port > 1000 && port < 65536) {
            info.urls.push({
              type: envType,
              url: `http://localhost:${port}`,
              label: `${scriptName} (port ${port})`,
              port
            });
            if (!info.ports.includes(port)) {
              info.ports.push(port);
            }
          }
        }
      }

      // Default ports voor frameworks als geen gevonden
      if (info.ports.length === 0) {
        if (info.setup_type === 'nextjs') {
          info.ports.push(3000);
          info.urls.push({ type: 'development', url: 'http://localhost:3000', label: 'Next.js Dev (port 3000)', port: 3000 });
        } else if (info.setup_type === 'react' || info.setup_type === 'vue') {
          info.ports.push(3000);
          info.urls.push({ type: 'development', url: 'http://localhost:3000', label: 'Dev Server (port 3000)', port: 3000 });
        }
      }
    } catch (error) {
      console.error(`Error parsing package.json for ${projectName}:`, error.message);
    }
  }

  // Analyseer docker-compose
  if (hasDockerCompose) {
    const wasUnknown = info.setup_type === 'unknown' || info.setup_type === 'nodejs';
    if (wasUnknown) {
      info.setup_type = 'docker-compose';
    }

    try {
      const composeFile = path.join(projectPath,
        fs.existsSync(path.join(projectPath, 'docker-compose.yml'))
          ? 'docker-compose.yml'
          : 'docker-compose.yaml'
      );
      const composeContent = fs.readFileSync(composeFile, 'utf-8');

      // Simpele regex om ports te vinden (niet perfect maar werkt voor basis cases)
      const portMatches = composeContent.matchAll(/['"]?(\d+):(\d+)['"]?/g);
      for (const match of portMatches) {
        const hostPort = parseInt(match[1]);
        if (hostPort > 1000 && hostPort < 65536 && !info.ports.includes(hostPort)) {
          info.ports.push(hostPort);
          info.urls.push({
            type: 'docker',
            url: `http://localhost:${hostPort}`,
            label: `Docker (port ${hostPort})`,
            port: hostPort
          });
        }
      }

      // Zoek naar environment variables met URLs
      const urlMatches = composeContent.matchAll(/(\w*URL\w*)[=:]\s*['"]?(https?:\/\/[^\s'"]+)/gi);
      for (const match of urlMatches) {
        const varName = match[1];
        const url = match[2];
        const urlType = varName.toLowerCase().includes('prod') ? 'production' :
          varName.toLowerCase().includes('dev') ? 'development' :
            varName.toLowerCase().includes('stage') || varName.toLowerCase().includes('stag') ? 'staging' :
              varName.toLowerCase().includes('demo') ? 'demo' :
                'other';
        info.urls.push({ type: urlType, url, label: varName });
      }
    } catch (error) {
      console.error(`Error parsing docker-compose for ${projectName}:`, error.message);
    }
  } else if (hasDockerfile) {
    if (info.setup_type === 'unknown' || info.setup_type === 'nodejs') {
      info.setup_type = 'docker';
    }
  }

  // Analyseer PM2 config
  if (hasPm2Config) {
    info.setup_type = 'pm2';
    // PM2 config analyse zou hier kunnen, maar is complexer omdat het JS is
  }

  // Python projecten
  if ((hasRequirements || hasPipfile) && !hasPackageJson) {
    info.setup_type = 'python';

    // Zoek naar Flask/Django/FastAPI
    try {
      let content = '';
      if (hasRequirements) {
        content = fs.readFileSync(path.join(projectPath, 'requirements.txt'), 'utf-8');
      }

      if (content.includes('flask')) {
        info.setup_type = 'python-flask';
        if (info.ports.length === 0) {
          info.ports.push(5000);
          info.urls.push({ type: 'development', url: 'http://localhost:5000', label: 'Flask Dev (port 5000)', port: 5000 });
        }
      } else if (content.includes('django')) {
        info.setup_type = 'python-django';
        if (info.ports.length === 0) {
          info.ports.push(8000);
          info.urls.push({ type: 'development', url: 'http://localhost:8000', label: 'Django Dev (port 8000)', port: 8000 });
        }
      } else if (content.includes('fastapi')) {
        info.setup_type = 'python-fastapi';
        if (info.ports.length === 0) {
          info.ports.push(8000);
          info.urls.push({ type: 'development', url: 'http://localhost:8000', label: 'FastAPI (port 8000)', port: 8000 });
        }
      } else if (content.includes('streamlit')) {
        info.setup_type = 'python-streamlit';
        if (info.ports.length === 0) {
          info.ports.push(8501);
          info.urls.push({ type: 'development', url: 'http://localhost:8501', label: 'Streamlit (port 8501)', port: 8501 });
        }
      }
    } catch (error) {
      console.error(`Error analyzing Python project ${projectName}:`, error.message);
    }
  }

  // Zoek naar .env files voor URLs en PORTS
  const envFiles = [
    { file: '.env.example', type: 'other' },
    { file: '.env', type: 'other' },
    { file: '.env.local', type: 'development' },
    { file: '.env.development', type: 'development' },
    { file: '.env.development.local', type: 'development' },
    { file: '.env.staging', type: 'staging' },
    { file: '.env.production', type: 'production' },
    { file: '.env.production.local', type: 'production' }
  ];

  for (const { file: envFile, type: defaultType } of envFiles) {
    const envPath = path.join(projectPath, envFile);
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');

        // Zoek naar ALL PORT variables (PORT, PORT_FRONTEND, PORT_BACKEND, etc.)
        const portMatches = envContent.matchAll(/^(PORT[_A-Z]*)\s*=\s*(\d+)/gim);
        for (const match of portMatches) {
          const varName = match[1];
          const port = parseInt(match[2]);
          if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
            info.ports.push(port);

            // Bepaal label op basis van variable naam
            let label;
            let urlType = defaultType;
            const lowerVar = varName.toLowerCase();
            if (lowerVar.includes('frontend') || lowerVar.includes('client')) {
              label = `Frontend (${envFile}: port ${port})`;
              urlType = 'development';
            } else if (lowerVar.includes('backend') || lowerVar.includes('server')) {
              label = `Backend (${envFile}: port ${port})`;
              urlType = 'production';
            } else if (lowerVar.includes('api')) {
              label = `API (${envFile}: port ${port})`;
              urlType = 'production';
            } else if (lowerVar.includes('docs')) {
              label = `Docs (${envFile}: port ${port})`;
              urlType = 'development';
            } else {
              label = `${varName} (${envFile}: port ${port})`;
            }

            info.urls.push({
              type: urlType,
              url: `http://localhost:${port}`,
              label,
              port,
              source: envFile
            });
          }
        }

        // Zoek naar URL variables
        const urlMatches = envContent.matchAll(/^(\w*URL\w*)\s*=\s*['"]?(https?:\/\/[^\s'"]+)/gim);
        for (const match of urlMatches) {
          const varName = match[1];
          const url = match[2];

          // Bepaal type op basis van variable naam of filename
          let urlType = defaultType;
          const lowerVarName = varName.toLowerCase();
          if (lowerVarName.includes('prod')) urlType = 'production';
          else if (lowerVarName.includes('dev')) urlType = 'development';
          else if (lowerVarName.includes('stage') || lowerVarName.includes('stag')) urlType = 'staging';
          else if (lowerVarName.includes('demo')) urlType = 'demo';

          // Voeg alleen toe als nog niet bestaat
          const exists = info.urls.some(u => u.url === url);
          if (!exists) {
            info.urls.push({ type: urlType, url, label: varName, source: envFile });
          }
        }
      } catch (error) {
        console.error(`Error reading ${envFile} for ${projectName}:`, error.message);
      }
    }
  }

  // Scan server files (server.js, app.js, index.js, main.py, etc.)
  const serverFiles = [
    'server.js', 'app.js', 'index.js', 'main.js', 'server.ts', 'app.ts', 'index.ts',
    'main.py', 'app.py', 'server.py', 'wsgi.py', 'asgi.py',
    'src/server.js', 'src/app.js', 'src/index.js', 'src/main.js',
    'src/main.py', 'src/app.py'
  ];

  for (const serverFile of serverFiles) {
    const serverPath = path.join(projectPath, serverFile);
    if (fs.existsSync(serverPath)) {
      try {
        const content = fs.readFileSync(serverPath, 'utf-8');

        // Match verschillende port patterns
        const patterns = [
          /port[:\s]*=\s*(\d+)/gi,                    // port: 3000, port = 3000
          /listen\((\d+)/gi,                           // listen(3000)
          /PORT\s*\|\|\s*(\d+)/gi,                     // PORT || 3000
          /PORT\s*\?\s*PORT\s*:\s*(\d+)/gi,            // PORT ? PORT : 3000
          /\|\|\s*(\d+)\s*;/g,                         // || 3000;
          /\.env\(['"]PORT['"]\)\s*\|\|\s*(\d+)/gi,   // .env('PORT') || 3000
        ];

        for (const pattern of patterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            const port = parseInt(match[1]);
            if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
              info.ports.push(port);
              info.urls.push({
                type: 'development',
                url: `http://localhost:${port}`,
                label: `${serverFile} (port ${port})`,
                port,
                source: serverFile
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error reading ${serverFile} for ${projectName}:`, error.message);
      }
    }
  }

  // Scan Makefile voor port info
  const makefilePath = path.join(projectPath, 'Makefile');
  if (fs.existsSync(makefilePath)) {
    try {
      const content = fs.readFileSync(makefilePath, 'utf-8');

      // Zoek naar PORT variables in Makefile
      const portMatches = content.matchAll(/PORT[_A-Z]*\s*[:?]?=\s*(\d+)/gi);
      for (const match of portMatches) {
        const port = parseInt(match[1]);
        if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
          info.ports.push(port);
          info.urls.push({
            type: 'development',
            url: `http://localhost:${port}`,
            label: `Makefile (port ${port})`,
            port,
            source: 'Makefile'
          });
        }
      }

      // Zoek naar localhost URLs in Makefile
      const urlMatches = content.matchAll(/https?:\/\/localhost:(\d+)/gi);
      for (const match of urlMatches) {
        const port = parseInt(match[1]);
        if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
          info.ports.push(port);
          info.urls.push({
            type: 'development',
            url: `http://localhost:${port}`,
            label: `Makefile (port ${port})`,
            port,
            source: 'Makefile'
          });
        }
      }
    } catch (error) {
      console.error(`Error reading Makefile for ${projectName}:`, error.message);
    }
  }

  // Scan README voor port info
  const readmeFiles = ['README.md', 'readme.md', 'README.txt', 'README'];
  for (const readmeFile of readmeFiles) {
    const readmePath = path.join(projectPath, readmeFile);
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf-8');

        // Zoek naar localhost URLs met poorten
        const urlMatches = content.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)/gi);
        for (const match of urlMatches) {
          const port = parseInt(match[1]);
          if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
            info.ports.push(port);
            info.urls.push({
              type: 'development',
              url: `http://localhost:${port}`,
              label: `${readmeFile} (port ${port})`,
              port,
              source: readmeFile
            });
          }
        }

        // Zoek naar "port 3000" style mentions
        const portMentions = content.matchAll(/port\s+(\d+)/gi);
        for (const match of portMentions) {
          const port = parseInt(match[1]);
          if (port > 1000 && port < 65536 && !info.ports.includes(port)) {
            info.ports.push(port);
            info.urls.push({
              type: 'development',
              url: `http://localhost:${port}`,
              label: `${readmeFile} (port ${port})`,
              port,
              source: readmeFile
            });
          }
        }
      } catch (error) {
        console.error(`Error reading ${readmeFile} for ${projectName}:`, error.message);
      }
      break; // Alleen eerste README lezen
    }
  }

  // Als geen ports gevonden, gebruik default
  if (info.ports.length === 0) {
    info.ports.push(3000);
  }

  // Sorteer ports (laagste eerst)
  info.ports.sort((a, b) => a - b);

  // Genereer URLs voor alle gevonden ports als er nog geen zijn
  if (info.urls.length === 0) {
    info.urls = info.ports.map(port => ({
      type: 'main',
      url: `http://localhost:${port}`,
      label: `Main (port ${port})`,
      port
    }));
  }

  // Zorg dat alle URLs een port hebben
  info.urls = info.urls.map(urlObj => {
    if (!urlObj.port && urlObj.url.includes('localhost')) {
      const portMatch = urlObj.url.match(/:(\d+)/);
      if (portMatch) {
        urlObj.port = parseInt(portMatch[1]);
      }
    }
    return urlObj;
  });

  // Verwijder duplicaten (zelfde URL + type)
  const seenUrls = new Map();
  info.urls = info.urls.filter(urlObj => {
    const key = `${urlObj.url}-${urlObj.type}`;
    if (seenUrls.has(key)) {
      // Behoud entry met source indien beschikbaar
      const existing = seenUrls.get(key);
      if (urlObj.source && !existing.source) {
        seenUrls.set(key, urlObj);
        return true;
      }
      return false;
    }
    seenUrls.set(key, urlObj);
    return true;
  });

  // Sorteer URLs: production eerst, dan development, staging, rest
  const typeOrder = { 'production': 1, 'development': 2, 'staging': 3, 'docker': 4, 'demo': 5, 'main': 6, 'other': 7 };
  info.urls.sort((a, b) => {
    const orderA = typeOrder[a.type] || 99;
    const orderB = typeOrder[b.type] || 99;
    if (orderA !== orderB) return orderA - orderB;
    // Bij gelijke type, sorteer op port
    return (a.port || 0) - (b.port || 0);
  });

  return info;
}

/**
 * Export projecten naar JSON formaat
 */
function exportToJson(projects) {
  return JSON.stringify(projects, null, 2);
}

/**
 * Import projecten van JSON
 */
function importFromJson(jsonString) {
  try {
    const projects = JSON.parse(jsonString);

    // Valideer de structuur
    if (!Array.isArray(projects)) {
      throw new Error('JSON moet een array van projecten zijn');
    }

    for (const project of projects) {
      if (!project.name || !project.directory_path) {
        throw new Error('Elk project moet minimaal een name en directory_path hebben');
      }
    }

    return { success: true, projects };
  } catch (error) {
    return { success: false, error: error.message, projects: [] };
  }
}

module.exports = {
  scanDirectory,
  analyzeProject,
  exportToJson,
  importFromJson
};
