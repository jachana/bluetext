#!/usr/bin/env node
// Test script to verify the Multirepo MCP Server functionality
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Multirepo MCP Server...\n');

// Test the server by running it and sending MCP requests
const serverPath = path.join(__dirname, 'build', 'index.js');

console.log('📍 Server path:', serverPath);
console.log('📁 Working directory:', __dirname);
console.log('📋 Config file: config.yml\n');

// Start the server process
const server = spawn('node', [serverPath], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseCount = 0;
const expectedResponses = 3;

// Test requests to send
const testRequests = [
  // 1. List tools
  {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list"
  },
  // 2. Call list_repos tool
  {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "list_repos",
      arguments: {}
    }
  },
  // 3. Call generate_graph tool
  {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "generate_graph",
      arguments: {}
    }
  }
];

// Handle server output
server.stdout.on('data', (data) => {
  const response = data.toString().trim();
  if (response) {
    try {
      const parsed = JSON.parse(response);
      responseCount++;
      
      console.log(`✅ Response ${responseCount}:`);
      console.log(JSON.stringify(parsed, null, 2));
      console.log('\n' + '='.repeat(50) + '\n');
      
      if (responseCount >= expectedResponses) {
        console.log('🎉 All tests completed successfully!');
        server.kill();
        process.exit(0);
      }
    } catch (e) {
      console.log('📝 Server log:', response);
    }
  }
});

// Handle server errors
server.stderr.on('data', (data) => {
  console.log('🔧 Server info:', data.toString().trim());
});

// Handle server exit
server.on('close', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
  if (code !== 0) {
    console.log('❌ Server failed to start or crashed');
    process.exit(1);
  }
});

// Send test requests with delays
setTimeout(() => {
  console.log('📤 Sending test request 1: List tools');
  server.stdin.write(JSON.stringify(testRequests[0]) + '\n');
}, 1000);

setTimeout(() => {
  console.log('📤 Sending test request 2: List repos');
  server.stdin.write(JSON.stringify(testRequests[1]) + '\n');
}, 2000);

setTimeout(() => {
  console.log('📤 Sending test request 3: Generate graph');
  server.stdin.write(JSON.stringify(testRequests[2]) + '\n');
}, 3000);

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - killing server');
  server.kill();
  process.exit(1);
}, 10000);
