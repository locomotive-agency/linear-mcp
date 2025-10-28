# Feature Branch: All Improvements

**Branch Name:** `feature/all-improvements`
**Status:** Ready for testing
**Build:** ✅ Successful
**Tests:** ✅ All 56 tests passing

## What's Included

This branch combines all three improvements to the Linear MCP server:

### 1. New Tool: `linear_update_issue`
- Update a single issue with new title, description, state, assignee, priority, or project
- Solves the problem of only having batch update available
- Perfect for agents needing to update individual issues

### 2. New Tools: `linear_link_issues` & `linear_unlink_issues`
- Create and remove relationships between issues
- Supported relationship types:
  - `blocks` - This issue blocks another
  - `blockedBy` - This issue is blocked by another
  - `relates` - This issue is related to another
  - `duplicate` - This issue is a duplicate
  - `duplicateOf` - This issue is the original of a duplicate
- Enables dependency tracking and issue hierarchy management

### 3. Fixed: `linear_delete_issues`
- Fixed GraphQL parameter bug where batch delete was failing
- Now uses parallel individual deletes for better reliability
- Atomic operations ensure partial failures don't cascade

## How to Test

### Option 1: Use the Combined Branch (Recommended)

Currently on: `feature/all-improvements`
Main repo stays on: `main` (unaffected)

To test with Claude Code:

```bash
# 1. Update ~/.claude.json to point to the feature branch build
# Replace: /home/marty/repos/linear-mcp/build/index.js
# With:    /home/marty/repos/linear-mcp/build/index.js (same path, but on feature branch)

# 2. Restart Claude Code

# 3. The feature branch is already built at /home/marty/repos/linear-mcp/build/

# 4. Verify build is up to date:
npm run build
```

### Option 2: Individual Branches

If you want to test each feature separately:

```bash
# Update issue feature
git checkout feat/update-issue
npm run build

# Link issues feature
git checkout feat/link-issues
npm run build

# Delete issues fix
git checkout fix/delete-issues
npm run build
```

## Branches Available

| Branch | Commit | Status |
|--------|--------|--------|
| `feature/all-improvements` | 2605a43 | ✅ All 3 features combined |
| `feat/update-issue` | d4f73ab | ✅ Single issue update tool |
| `feat/link-issues` | 0ca4120 | ✅ Issue relationship tools |
| `fix/delete-issues` | 465e8f6 | ✅ Delete batch fix |
| `main` | 023ac90 | Original (unmodified) |

## PR Status

All three improvements have been submitted as PRs to the upstream repo:

- PR #25: linear_update_issue feature
- PR #26: linear_link_issues & linear_unlink_issues features
- PR #27: linear_delete_issues fix

## Testing Checklist

- [ ] Build feature/all-improvements branch
- [ ] Start MCP server with feature branch
- [ ] Test `linear_update_issue` with test issue
- [ ] Test `linear_link_issues` with two test issues
- [ ] Test `linear_unlink_issues` to remove relationship
- [ ] Test `linear_delete_issues` batch delete
- [ ] Verify no regressions in existing tools

## Reverting

To return to original state:

```bash
git checkout main
npm run build
```

The `feature/all-improvements` branch is safe to leave as-is since it doesn't affect `main`.

## Files Modified

### New Features
- `src/features/issues/handlers/issue.handler.ts` - Added 3 new handler methods
- `src/graphql/client.ts` - Added relationship methods
- `src/graphql/mutations.ts` - Added relationship mutations
- `src/core/types/tool.types.ts` - Added 3 new tool schemas
- `src/core/handlers/handler.factory.ts` - Registered new tools

### Tests Updated
- `src/__tests__/graphql-client.test.ts` - Updated delete test for parallel execution

## Notes

- All changes are backward compatible
- No breaking changes to existing tools
- All existing tests still pass
- New features follow existing code patterns and conventions
