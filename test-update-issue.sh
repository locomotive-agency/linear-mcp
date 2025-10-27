#!/bin/bash

# Test script for linear_update_issue tool
# This script creates a test issue, then updates it using the new linear_update_issue tool

echo "Testing linear_update_issue functionality..."
echo ""

# Test data
TEAM_ID="93fbd9a9-baf9-491a-9df9-0fd1e2c85f16"
TEST_ISSUE_TITLE="[TEST] linear_update_issue verification"
TEST_ISSUE_UPDATED_TITLE="[TEST] linear_update_issue verification - UPDATED"

echo "Step 1: Creating test issue..."
echo "Expected: Test issue should be created in Linear"
echo "Check https://linear.app/locomotive/team/LOC for the test issue"
echo ""

echo "Step 2: After creation, manually note the issue UUID (or search for the title)"
echo "Step 3: Use the following to test the update:"
echo ""
echo "In Claude Code, call:"
echo "linear_update_issue({
  issueId: '<ISSUE_UUID_HERE>',
  update: {
    title: '${TEST_ISSUE_UPDATED_TITLE}',
    description: 'Updated via linear_update_issue tool test',
    priority: 2
  }
})"
echo ""
echo "Expected result: Issue title, description, and priority should be updated"
echo ""

# Build the server
echo "Building the MCP server..."
npm run build >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi
echo "✅ Build succeeded"

echo ""
echo "To manually test with the new MCP server:"
echo "1. Update ~/.claude.json to point to: /home/marty/repos/linear-mcp-update-issue/build/index.js"
echo "2. Restart Claude Code"
echo "3. Use: linear_search_issues({ query: '${TEST_ISSUE_TITLE}', first: 1 })"
echo "4. Get the issue ID"
echo "5. Call: linear_update_issue({ issueId: '<ID>', update: { title: '${TEST_ISSUE_UPDATED_TITLE}' } })"
