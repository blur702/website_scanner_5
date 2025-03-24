const { exec } = require('child_process');
const http = require('http');

// Function to check if server is running
function checkServer(port, callback) {
  http.get(`http://localhost:${port}/api/health`, (res) => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running and responding to health checks');
      res.on('data', (chunk) => {
        try {
          const data = JSON.parse(chunk);
          console.log(`   Server time: ${new Date(data.timestamp * 1000).toISOString()}`);
        } catch (e) {
          console.log(`   Response: ${chunk.toString()}`);
        }
      });
      callback(true);
    } else {
      console.log(`❌ Server responded with status code: ${res.statusCode}`);
      callback(false);
    }
  }).on('error', (e) => {
    console.log(`❌ Server check failed: ${e.message}`);
    callback(false);
  });
}

// Test function
async function runTests() {
  console.log('🧪 Running Website Checker tests...');
  console.log('Checking server status...');
  
  return new Promise((resolve) => {
    checkServer(8000, (serverRunning) => {
      if (!serverRunning) {
        console.log('Starting server...');
        const server = exec('uvicorn app.main:app --host 0.0.0.0 --port 8000');
        
        server.stdout.on('data', (data) => {
          console.log(`Server output: ${data}`);
          if (data.includes('Application startup complete')) {
            console.log('Server started successfully, checking API...');
            setTimeout(() => {
              checkServer(8000, (isRunning) => {
                if (isRunning) {
                  console.log('✅ All tests passed!');
                  resolve(true);
                } else {
                  console.log('❌ Server failed to start properly');
                  resolve(false);
                }
              });
            }, 2000);
          }
        });
        
        server.stderr.on('data', (data) => {
          console.error(`Server error: ${data}`);
        });
      } else {
        console.log('✅ All tests passed!');
        resolve(true);
      }
    });
  });
}

// Run the tests
if (require.main === module) {
  runTests().then((passed) => {
    console.log(`Test run ${passed ? 'successful' : 'failed'}`);
    if (!passed) {
      process.exit(1);
    }
  });
}

module.exports = { runTests };
