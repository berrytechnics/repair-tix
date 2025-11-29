const path = require('path');
const fs = require('fs');

module.exports = (request, options) => {
  // Use default resolver first
  const defaultResolver = options.defaultResolver;
  
  // If it's a relative import ending in .js, check if it should map to .ts
  if (request.startsWith('../') || request.startsWith('./')) {
    if (request.endsWith('.js')) {
      // Try to resolve the .ts file in src directory
      const importingFile = options.basedir || options.importingFile;
      const rootDir = options.rootDir || process.cwd();
      const srcPath = path.resolve(rootDir, 'src');
      
      // Check if the importing file is in src (including teardown files)
      if (importingFile && importingFile.includes(srcPath)) {
        // Resolve the .ts file
        const tsRequest = request.replace(/\.js$/, '.ts');
        try {
          const resolved = defaultResolver(tsRequest, options);
          // Check if the resolved file exists and is in src
          if (fs.existsSync(resolved) && resolved.includes(srcPath)) {
            return resolved;
          }
        } catch (e) {
          // If .ts resolution fails, try original .js
        }
      }
    }
  }
  
  // Fall back to default resolver
  return defaultResolver(request, options);
};

