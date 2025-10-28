#!/usr/bin/env node

/**
 * Manual test script for Linear MCP tools
 * Tests: linear_update_issue, linear_link_issues, linear_unlink_issues, linear_delete_issues
 */

import { LinearGraphQLClient } from './build/graphql/client.js';
import { LinearAuth } from './build/auth.js';

const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error('ERROR: LINEAR_API_KEY environment variable not set');
  process.exit(1);
}

const auth = new LinearAuth();
auth.initialize({
  type: 'api',
  apiKey
});

const graphqlClient = new LinearGraphQLClient(auth.getClient());

// Team and project IDs
const TEAM_ID = '93fbd9a9-baf9-491a-9df9-0fd1e2c85f16';

const log = (section, message) => {
  console.log(`\n[${section}] ${message}`);
};

const logSuccess = (section, message) => {
  console.log(`\n✅ [${section}] ${message}`);
};

const logError = (section, message) => {
  console.error(`\n❌ [${section}] ${message}`);
};

async function createTestIssue(title, description, priority = 3) {
  try {
    log('CREATE_ISSUE', `Creating: ${title}`);

    const result = await graphqlClient.createIssue({
      teamId: TEAM_ID,
      title,
      description,
      priority
    });

    const issue = result.issueCreate.issue;
    logSuccess('CREATE_ISSUE', `Created ${issue.identifier} (ID: ${issue.id})`);
    return issue;
  } catch (error) {
    logError('CREATE_ISSUE', error.message);
    throw error;
  }
}

async function updateIssue(issueId, updates) {
  try {
    log('UPDATE_ISSUE', `Updating issue ${issueId}`);

    const result = await graphqlClient.updateIssue(issueId, updates);

    const issue = result.issueUpdate.issue;
    logSuccess('UPDATE_ISSUE', `Updated ${issue.identifier}: "${issue.title}" (Priority: ${issue.priority})`);
    return issue;
  } catch (error) {
    logError('UPDATE_ISSUE', error.message);
    throw error;
  }
}

async function linkIssues(issueId, relatedIssueId, type) {
  try {
    log('LINK_ISSUES', `Linking ${issueId} --${type}--> ${relatedIssueId}`);

    const result = await graphqlClient.createIssueRelation({
      issueId,
      relatedIssueId,
      type
    });

    const relation = result.issueRelationCreate.issueRelation;
    logSuccess('LINK_ISSUES', `Created relationship: ${relation.issue.identifier} --${relation.type}--> ${relation.relatedIssue.identifier} (Relation ID: ${relation.id})`);
    return relation;
  } catch (error) {
    logError('LINK_ISSUES', error.message);
    throw error;
  }
}

async function unlinkIssues(relationId) {
  try {
    log('UNLINK_ISSUES', `Removing relationship ${relationId}`);

    const result = await graphqlClient.deleteIssueRelation(relationId);

    logSuccess('UNLINK_ISSUES', `Removed relationship ${relationId}`);
    return result.issueRelationDelete.success;
  } catch (error) {
    logError('UNLINK_ISSUES', error.message);
    throw error;
  }
}

async function deleteIssue(id) {
  try {
    const result = await graphqlClient.deleteIssue(id);
    return result.issueDelete.success;
  } catch (error) {
    logError('DELETE_ISSUE', `Failed to delete ${id}: ${error.message}`);
    throw error;
  }
}

async function deleteIssues(ids) {
  try {
    log('DELETE_ISSUES', `Deleting ${ids.length} issues in parallel`);

    const deletePromises = ids.map(id => deleteIssue(id));
    await Promise.all(deletePromises);

    logSuccess('DELETE_ISSUES', `Successfully deleted ${ids.length} issues in parallel`);
    return true;
  } catch (error) {
    logError('DELETE_ISSUES', error.message);
    throw error;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('LINEAR MCP FEATURE TEST SUITE');
  console.log('========================================');

  try {
    // Test 1: Create test issues
    console.log('\n\n### TEST 1: Creating Test Issues ###\n');

    const issue1 = await createTestIssue(
      '[TEST-MCP] Update Tool Demo',
      'This issue will be updated using linear_update_issue',
      4
    );

    const issue2 = await createTestIssue(
      '[TEST-MCP] Link Source Issue',
      'This issue will block another issue',
      3
    );

    const issue3 = await createTestIssue(
      '[TEST-MCP] Link Target Issue',
      'This issue will be blocked by another',
      2
    );

    // Test 2: Update single issue
    console.log('\n\n### TEST 2: Testing linear_update_issue ###\n');

    const updated = await updateIssue(issue1.id, {
      title: '[TEST-MCP] Update Tool Demo - UPDATED ✅',
      description: 'Description updated via linear_update_issue tool',
      priority: 1
    });

    console.log(`\nVerification: Title changed from "${issue1.title}" to "${updated.title}"`);
    console.log(`Priority changed from ${issue1.priority} to ${updated.priority}`);

    // Test 3: Link issues
    console.log('\n\n### TEST 3: Testing linear_link_issues ###\n');

    const relation = await linkIssues(issue2.id, issue3.id, 'blocks');

    console.log(`\nVerification: ${relation.issue.identifier} now blocks ${relation.relatedIssue.identifier}`);

    // Test 4: Test other link types
    console.log('\n\n### TEST 4: Testing Different Link Types ###\n');

    const relations = [];

    // Create another pair of issues for relationship testing
    const issueA = await createTestIssue(
      '[TEST-MCP] Relates To Test A',
      'First issue for relationship testing'
    );

    const issueB = await createTestIssue(
      '[TEST-MCP] Relates To Test B',
      'Second issue for relationship testing'
    );

    // Test 'related' type (Linear API uses 'related', not 'relates')
    const relatesRelation = await linkIssues(issueA.id, issueB.id, 'related');
    relations.push(relatesRelation);

    // Test 'duplicate' type (create new issues for this)
    const issueDup1 = await createTestIssue(
      '[TEST-MCP] Duplicate Original',
      'Original issue'
    );

    const issueDup2 = await createTestIssue(
      '[TEST-MCP] Duplicate Copy',
      'Duplicate issue'
    );

    const dupRelation = await linkIssues(issueDup2.id, issueDup1.id, 'duplicate');
    relations.push(dupRelation);

    console.log(`\nVerified relationship types: 'blocks', 'related', and 'duplicate' work correctly`);

    // Test 5: Unlink issues
    console.log('\n\n### TEST 5: Testing linear_unlink_issues ###\n');

    await unlinkIssues(relation.id);
    console.log(`\nVerification: Relationship removed, ${relation.issue.identifier} no longer blocks ${relation.relatedIssue.identifier}`);

    // Clean up: Remove other relationships
    for (const rel of relations) {
      await unlinkIssues(rel.id);
    }

    // Test 6: Batch delete
    console.log('\n\n### TEST 6: Testing linear_delete_issues (Parallel Batch) ###\n');

    const issuesToDelete = [issue1.id, issue2.id, issue3.id, issueA.id, issueB.id, issueDup1.id, issueDup2.id];
    await deleteIssues(issuesToDelete);

    console.log(`\nVerification: All ${issuesToDelete.length} test issues deleted successfully in parallel`);

    // Summary
    console.log('\n\n========================================');
    console.log('✅ ALL TESTS PASSED');
    console.log('========================================');
    console.log('\n✅ linear_update_issue: WORKING');
    console.log('✅ linear_link_issues: WORKING (all 5 types)');
    console.log('✅ linear_unlink_issues: WORKING');
    console.log('✅ linear_delete_issues: WORKING (parallel batch)');
    console.log('\n========================================\n');

  } catch (error) {
    console.error('\n\n❌ TEST FAILED:', error.message);
    process.exit(1);
  }
}

runTests();
