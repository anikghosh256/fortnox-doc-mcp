#!/usr/bin/env node

/**
 * Test script to verify MCP server functionality
 * This tests that the server can load and parse the OpenAPI spec
 */

import { getOpenAPIParser } from './openapi-parser.js';

console.log('🧪 Testing Fortnox MCP Server Components...\n');

try {
  // Test 1: Load OpenAPI Parser
  console.log('1. Loading OpenAPI specification...');
  const parser = getOpenAPIParser();
  console.log('   OpenAPI parser loaded successfully');

  // Test 2: Get base URL
  console.log('\n2. Checking API base URL...');
  const baseUrl = parser.getBaseUrl();
  console.log(`   Base URL: ${baseUrl}`);

  // Test 3: Count endpoints
  console.log('\n3. Parsing endpoints from OpenAPI spec...');
  const endpoints = parser.getAllEndpoints();
  console.log(`   Found ${endpoints.length} endpoints`);

  // Test 4: Show sample endpoints
  console.log('\n4. Sample endpoints:');
  const sampleEndpoints = endpoints.slice(0, 5);
  for (const endpoint of sampleEndpoints) {
    console.log(`   • ${endpoint.method} ${endpoint.path}`);
    console.log(`     Operation: ${endpoint.operationId}`);
    console.log(`     Summary: ${endpoint.summary || 'N/A'}`);
  }

  // Test 5: Show endpoint statistics
  console.log('\n5. Endpoint statistics:');
  const methodCounts: Record<string, number> = {};
  for (const endpoint of endpoints) {
    methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
  }
  for (const [method, count] of Object.entries(methodCounts)) {
    console.log(`   ${method}: ${count} endpoints`);
  }

  // Test 6: Show tags (resource groups)
  console.log('\n6. Resource groups (tags):');
  const tags = new Set<string>();
  for (const endpoint of endpoints) {
    if (endpoint.tags) {
      endpoint.tags.forEach(tag => tags.add(tag));
    }
  }
  console.log(`   ${tags.size} resource groups found`);
  const sampleTags = Array.from(tags).slice(0, 10);
  for (const tag of sampleTags) {
    console.log(`   • ${tag}`);
  }

  console.log('\nAll tests passed! Server components are working correctly.\n');
  console.log('Next steps:');
  console.log('   1. Run: npm start');
  console.log('   2. Configure in your MCP client (Claude Desktop, etc.)\n');

} catch (error) {
  console.error('\nTest failed:', error);
  process.exit(1);
}
