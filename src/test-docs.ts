#!/usr/bin/env node

/**
 * Test script for documentation server
 */

import { getOpenAPIParser } from './openapi-parser.js';

console.log('Testing Fortnox Documentation Server...\n');

try {
  const parser = getOpenAPIParser();
  const endpoints = parser.getAllEndpoints();

  console.log(`Loaded ${endpoints.length} endpoints\n`);

  // Show 5 sample tools that will be available
  console.log('Sample Documentation Tools Available:');
  console.log('  1. list_all_endpoints - Browse all Fortnox API endpoints');
  console.log('  2. get_endpoint_details - Get full documentation for an endpoint');
  console.log('  3. search_endpoints - Search for endpoints by keyword');
  console.log('  4. list_resource_groups - See all API resource categories');
  console.log('  5. get_schema_details - View data model schemas\n');

  // Show sample endpoints
  console.log('Sample Endpoints from OpenAPI Spec:');
  endpoints.slice(0, 5).forEach(e => {
    console.log(`  • ${e.method} ${e.path}`);
    console.log(`    ${e.summary || 'No summary'}`);
  });

  console.log('\nServer ready! No API credentials needed for documentation browsing.');
  console.log('This is a documentation server - it provides API info, not API calls.\n');

} catch (error) {
  console.error('Test failed:', error);
  process.exit(1);
}
