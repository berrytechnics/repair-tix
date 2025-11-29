// CommonJS wrapper for globalTeardown to support ES modules
// Jest's globalTeardown runs in a CommonJS context, so we need this wrapper
// to load and execute the ES module teardown file

const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

module.exports = async function globalTeardown() {
  try {
    // Try to load the compiled JavaScript from dist (if available)
    // This is the most reliable approach since it doesn't require TypeScript transformation
    const distPath = path.resolve(__dirname, 'dist/src/config/connection.js');
    
    if (fs.existsSync(distPath)) {
      try {
        const distUrl = pathToFileURL(distPath).href;
        const connectionModule = await import(distUrl);
        const { closeConnection } = connectionModule;
        
        if (typeof closeConnection === 'function') {
          await closeConnection();
          // Give a small delay to ensure connections are fully closed
          // Use unref() to prevent timer from keeping the process alive
          await new Promise((resolve) => {
            const timer = setTimeout(resolve, 100);
            timer.unref();
          });
          return;
        }
      } catch (distError) {
        // If dist import fails (e.g., due to CommonJS/ESM interop issues),
        // that's okay - Jest will force exit anyway with forceExit: true
        // Silently continue - the error is expected in some cases
      }
    }
    // If dist doesn't exist or import fails, that's okay
    // Jest will force exit with forceExit: true, so connections will be closed by the OS
  } catch (error) {
    // Silently ignore errors - we want tests to complete even if teardown fails
    // With forceExit: true, Jest will close everything anyway
  }
};

