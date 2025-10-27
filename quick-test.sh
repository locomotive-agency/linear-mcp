#!/bin/bash

# Linear MCP Migration - Quick Test Script
# Run this after restarting Claude Code to verify the new MCP server

echo "=========================================="
echo "Linear MCP Migration - Quick Test"
echo "=========================================="
echo ""

TEAM_ID="93fbd9a9-baf9-491a-9df9-0fd1e2c85f16"
PROJECT_ID="845affa8-1b24-476f-9109-17ba6e4b7547"

echo "Testing new cline/linear-mcp server..."
echo ""

# Test 1: Check if server is running
echo "📋 Test 1: Server Connectivity"
echo "Command: linear_get_viewer()"
echo "Expected: Your Linear user info"
echo ""
echo "➡️  Run in Claude Code and check result"
echo ""

# Test 2: Search (was broken)
echo "🔍 Test 2: Search Functionality (CRITICAL - was broken)"
echo "Command: linear_search_issues({ query: \"LOC-159\", limit: 5 })"
echo "Expected: Should find LOC-159 or similar issues"
echo "Old behavior: ❌ 'Deprecated' error"
echo "New behavior: ✅ Returns search results"
echo ""
echo "➡️  Run in Claude Code and verify NO 'Deprecated' error"
echo ""

# Test 3: Projects with descriptions
echo "📝 Test 3: Project Descriptions (CRITICAL - were empty)"
echo "Command: linear_get_projects({ limit: 5, status: \"In Progress\" })"
echo "Expected: Projects with populated descriptions"
echo "Old behavior: ❌ description: \"\""
echo "New behavior: ✅ description: \"[actual content]\""
echo ""
echo "➡️  Run in Claude Code and check descriptions are NOT empty"
echo ""

# Test 4: Team issues without token limit
echo "📦 Test 4: Team Issues (CRITICAL - had token limit)"
echo "Command: linear_get_project_issues({ projectId: \"$PROJECT_ID\", limit: 50 })"
echo "Expected: Returns issues successfully"
echo "Old behavior: ❌ Token limit error (215K tokens)"
echo "New behavior: ✅ Returns issues (no error)"
echo ""
echo "➡️  Run in Claude Code and verify NO token limit error"
echo ""

# Test 5: Create test issue
echo "➕ Test 5: Create Issue"
echo "Command:"
cat << 'EOF'
linear_create_issue({
  title: "[TEST] Migration Verification",
  teamId: "93fbd9a9-baf9-491a-9df9-0fd1e2c85f16",
  description: "Test issue to verify cline/linear-mcp is working",
  priority: 3,
  status: "Todo"
})
EOF
echo ""
echo "Expected: Issue created successfully with ID returned"
echo ""
echo "➡️  Run in Claude Code and save the returned issue ID"
echo ""

# Test 6: Batch operations (new feature)
echo "🚀 Test 6: Batch Operations (NEW FEATURE)"
echo "Command:"
cat << 'EOF'
linear_batch_create_issues({
  issues: [
    { title: "[TEST] Batch 1", teamId: "93fbd9a9-baf9-491a-9df9-0fd1e2c85f16", description: "Test", priority: 4 },
    { title: "[TEST] Batch 2", teamId: "93fbd9a9-baf9-491a-9df9-0fd1e2c85f16", description: "Test", priority: 4 },
    { title: "[TEST] Batch 3", teamId: "93fbd9a9-baf9-491a-9df9-0fd1e2c85f16", description: "Test", priority: 4 }
  ]
})
EOF
echo ""
echo "Expected: 3 issues created in single call"
echo "Old behavior: ❌ Feature not available"
echo "New behavior: ✅ Batch create works"
echo ""
echo "➡️  Run in Claude Code and verify all 3 issues created"
echo ""

echo "=========================================="
echo "Quick Test Summary"
echo "=========================================="
echo ""
echo "CRITICAL TESTS (Must Pass):"
echo "  1. ✅/❌ Search works (no 'Deprecated' error)"
echo "  2. ✅/❌ Project descriptions populated (not empty)"
echo "  3. ✅/❌ No token limit errors on large queries"
echo "  4. ✅/❌ Batch operations available"
echo ""
echo "If all 4 critical tests pass:"
echo "  ➡️  Migration SUCCESSFUL ✅"
echo "  ➡️  Clean up test issues"
echo "  ➡️  Proceed with Phase 2 improvements"
echo ""
echo "If any critical test fails:"
echo "  ➡️  Review error messages"
echo "  ➡️  Check test-migration.md for detailed debugging"
echo "  ➡️  Consider rollback if necessary"
echo ""
echo "=========================================="
echo "Detailed Test Plan: /home/marty/repos/linear-mcp/test-migration.md"
echo "=========================================="
