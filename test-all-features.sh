#!/bin/bash

# Comprehensive test script for all new Linear MCP features
# Tests: linear_update_issue, linear_link_issues, linear_unlink_issues, linear_delete_issues

set -e

TEAM_ID="93fbd9a9-baf9-491a-9df9-0fd1e2c85f16"
PROJECT_ID="845affa8-1b24-476f-9109-17ba6e4b7547"

echo "========================================"
echo "Linear MCP Feature Testing Suite"
echo "========================================"
echo ""

# Helper function to make API calls
call_tool() {
    local tool_name=$1
    local args=$2
    echo "Calling: $tool_name"
    echo "Args: $args"
    # This would be called via Claude Code MCP interface
    # For now, we're just showing what would be called
}

echo "Test 1: Creating test issues"
echo "============================"
echo ""
echo "Creating issue 1 (TEST-UPDATE-DEMO):"
call_tool "linear_create_issue" "{
  title: '[TEST] Demo Issue for Update',
  description: 'Original description - will be updated',
  teamId: '$TEAM_ID',
  priority: 4
}"
echo ""
echo "Expected: Issue created with priority=4 (Low)"
echo ""

echo "Creating issue 2 (TEST-LINK-SOURCE):"
call_tool "linear_create_issue" "{
  title: '[TEST] Source Issue for Linking',
  description: 'This issue will block another',
  teamId: '$TEAM_ID'
}"
echo ""
echo "Expected: Issue created successfully"
echo ""

echo "Creating issue 3 (TEST-LINK-TARGET):"
call_tool "linear_create_issue" "{
  title: '[TEST] Target Issue for Linking',
  description: 'This issue will be blocked',
  teamId: '$TEAM_ID'
}"
echo ""
echo "Expected: Issue created successfully"
echo ""

echo "Test 2: Testing linear_update_issue"
echo "===================================="
echo ""
echo "Action: Update TEST-UPDATE-DEMO issue"
call_tool "linear_update_issue" "{
  issueId: '<ISSUE_1_UUID_FROM_TEST_1>',
  update: {
    title: '[TEST] Demo Issue - UPDATED',
    description: 'This description has been updated!',
    priority: 1
  }
}"
echo ""
echo "Expected Results:"
echo "  - Issue title changes to '[TEST] Demo Issue - UPDATED'"
echo "  - Description changes to 'This description has been updated!'"
echo "  - Priority changes from 4 (Low) to 1 (Urgent)"
echo ""

echo "Test 3: Testing linear_link_issues"
echo "=================================="
echo ""
echo "Action: Link TEST-LINK-SOURCE blocks TEST-LINK-TARGET"
call_tool "linear_link_issues" "{
  issueId: '<ISSUE_2_UUID_FROM_TEST_1>',
  relatedIssueId: '<ISSUE_3_UUID_FROM_TEST_1>',
  type: 'blocks'
}"
echo ""
echo "Expected Results:"
echo "  - Relationship created: SOURCE blocks TARGET"
echo "  - TEST-LINK-SOURCE shows as blocking TARGET"
echo "  - TEST-LINK-TARGET shows as blocked by SOURCE"
echo ""

echo "Test 4: Testing linear_unlink_issues"
echo "====================================="
echo ""
echo "Action: Remove the relationship created in Test 3"
call_tool "linear_unlink_issues" "{
  relationId: '<RELATION_ID_FROM_TEST_3>'
}"
echo ""
echo "Expected Results:"
echo "  - Relationship removed successfully"
echo "  - TEST-LINK-SOURCE no longer blocks TARGET"
echo "  - TEST-LINK-TARGET no longer shows blocked by"
echo ""

echo "Test 5: Testing linear_delete_issues (Parallel Batch)"
echo "====================================================="
echo ""
echo "Action: Delete all three test issues at once"
call_tool "linear_delete_issues" "{
  ids: [
    '<ISSUE_1_UUID_FROM_TEST_1>',
    '<ISSUE_2_UUID_FROM_TEST_1>',
    '<ISSUE_3_UUID_FROM_TEST_1>'
  ]
}"
echo ""
echo "Expected Results:"
echo "  - All three issues deleted successfully"
echo "  - Deletes executed in parallel (not sequential)"
echo "  - No GraphQL parameter errors"
echo ""

echo "========================================"
echo "MANUAL TESTING INSTRUCTIONS"
echo "========================================"
echo ""
echo "To run these tests:"
echo ""
echo "1. Get issue UUIDs from create calls by searching for test issues:"
echo "   linear_search_issues({ query: '[TEST]', first: 10 })"
echo ""
echo "2. Run Test 2 (Update Issue):"
echo "   linear_update_issue({"
echo "     issueId: '<UUID>',',"
echo "     update: {"
echo "       title: '[TEST] Demo Issue - UPDATED',"
echo "       description: 'This description has been updated!',"
echo "       priority: 1"
echo "     }"
echo "   })"
echo ""
echo "3. Run Test 3 (Link Issues):"
echo "   linear_link_issues({"
echo "     issueId: '<SOURCE_UUID>',"
echo "     relatedIssueId: '<TARGET_UUID>',"
echo "     type: 'blocks'"
echo "   })"
echo ""
echo "4. Run Test 4 (Unlink Issues):"
echo "   linear_unlink_issues({"
echo "     relationId: '<RELATION_UUID>'"
echo "   })"
echo ""
echo "5. Run Test 5 (Delete Issues):"
echo "   linear_delete_issues({"
echo "     ids: ['<UUID_1>', '<UUID_2>', '<UUID_3>']"
echo "   })"
echo ""
echo "========================================"
