import { BaseHandler } from '../../../core/handlers/base.handler.js';
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js';
import { LinearAuth } from '../../../auth.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';
import {
  IssueHandlerMethods,
  CreateIssueInput,
  CreateIssuesInput,
  UpdateIssueInput,
  BulkUpdateIssuesInput,
  SearchIssuesInput,
  DeleteIssueInput,
  DeleteIssuesInput,
  CreateIssueResponse,
  CreateIssuesResponse,
  UpdateIssuesResponse,
  SearchIssuesResponse,
  DeleteIssueResponse,
  Issue,
  IssueBatchResponse
} from '../types/issue.types.js';

/**
 * Handler for issue-related operations.
 * Manages creating, updating, searching, and deleting issues.
 */
export class IssueHandler extends BaseHandler implements IssueHandlerMethods {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Creates a single issue.
   */
  async handleCreateIssue(args: CreateIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['title', 'description', 'teamId']);

      // Process input to ensure correct types
      const processedArgs = { ...args };
      
      // Convert estimate to integer if present
      if (processedArgs.estimate !== undefined) {
        processedArgs.estimate = parseInt(String(processedArgs.estimate), 10);
        
        // If parsing fails, remove the estimate field
        if (isNaN(processedArgs.estimate)) {
          delete processedArgs.estimate;
        }
      }
      
      // Convert priority to integer if present
      if (processedArgs.priority !== undefined) {
        processedArgs.priority = parseInt(String(processedArgs.priority), 10);
        
        // If parsing fails or out of range, use default priority
        if (isNaN(processedArgs.priority) || processedArgs.priority < 0 || processedArgs.priority > 4) {
          processedArgs.priority = 0;
        }
      }

      const result = await client.createIssue(processedArgs) as CreateIssueResponse;

      if (!result.issueCreate.success || !result.issueCreate.issue) {
        throw new Error('Failed to create issue');
      }

      const issue = result.issueCreate.issue;

      return this.createResponse(
        `Successfully created issue\n` +
        `Issue: ${issue.identifier}\n` +
        `Title: ${issue.title}\n` +
        `URL: ${issue.url}\n` +
        `Project: ${issue.project ? issue.project.name : 'None'}`
      );
    } catch (error) {
      this.handleError(error, 'create issue');
    }
  }

  /**
   * Creates multiple issues in bulk.
   */
  async handleCreateIssues(args: CreateIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issues']);

      if (!Array.isArray(args.issues)) {
        throw new Error('Issues parameter must be an array');
      }

      const result = await client.createIssues(args.issues) as IssueBatchResponse;

      if (!result.issueBatchCreate.success) {
        throw new Error('Failed to create issues');
      }

      const createdIssues = result.issueBatchCreate.issues as Issue[];

      return this.createResponse(
        `Successfully created ${createdIssues.length} issues:\n` +
        createdIssues.map(issue =>
          `- ${issue.identifier}: ${issue.title}\n  URL: ${issue.url}`
        ).join('\n')
      );
    } catch (error) {
      this.handleError(error, 'create issues');
    }
  }

  /**
   * Updates a single issue.
   */
  async handleUpdateIssue(args: { issueId: string; update: UpdateIssueInput }): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issueId', 'update']);

      // Convert numeric fields to correct types
      const processedUpdate = { ...args.update };

      if (processedUpdate.priority !== undefined) {
        processedUpdate.priority = parseInt(String(processedUpdate.priority), 10);

        if (isNaN(processedUpdate.priority) || processedUpdate.priority < 0 || processedUpdate.priority > 4) {
          delete processedUpdate.priority;
        }
      }

      const result = await client.updateIssue(args.issueId, processedUpdate) as UpdateIssuesResponse;

      if (!result.issueUpdate.success) {
        throw new Error('Failed to update issue');
      }

      const updatedIssue = result.issueUpdate.issue;

      return this.createResponse(
        `Successfully updated issue\n` +
        `Issue: ${updatedIssue.identifier}\n` +
        `Title: ${updatedIssue.title}\n` +
        `URL: ${updatedIssue.url}`
      );
    } catch (error) {
      this.handleError(error, 'update issue');
    }
  }

  /**
   * Updates multiple issues in bulk.
   * Note: Linear API doesn't support true bulk updates, so this loops individual updates.
   */
  async handleBulkUpdateIssues(args: BulkUpdateIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issueIds', 'update']);

      if (!Array.isArray(args.issueIds)) {
        throw new Error('IssueIds parameter must be an array');
      }

      if (args.issueIds.length === 0) {
        return this.createResponse('No issues to update');
      }

      // Linear API only supports single issue updates via issueUpdate(id: String!)
      // So we loop and update each issue individually
      const results = [];
      const errors = [];

      for (const issueId of args.issueIds) {
        try {
          const result = await client.updateIssue(issueId, args.update) as UpdateIssuesResponse;

          if (result.issueUpdate.success && result.issueUpdate.issue) {
            results.push(result.issueUpdate.issue);
          } else {
            errors.push(`Failed to update issue ${issueId}`);
          }
        } catch (error) {
          errors.push(`Error updating ${issueId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const successCount = results.length;
      const failureCount = errors.length;

      let response = `Bulk update completed: ${successCount} succeeded, ${failureCount} failed`;

      if (results.length > 0) {
        response += `\n\nUpdated issues:\n${results.map(issue => `- ${issue.identifier}: ${issue.title}`).join('\n')}`;
      }

      if (errors.length > 0) {
        response += `\n\nErrors:\n${errors.map(err => `- ${err}`).join('\n')}`;
      }

      return this.createResponse(response);
    } catch (error) {
      this.handleError(error, 'update issues');
    }
  }

  /**
   * Searches for issues with filtering and pagination.
   */
  async handleSearchIssues(args: SearchIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const filter: Record<string, unknown> = {};
      
      if (args.query) {
        // For both identifier and text searches, use the title filter with contains
        // This is a workaround since Linear API doesn't directly support identifier filtering
        filter.or = [
          { title: { containsIgnoreCase: args.query } },
          { number: { eq: this.extractIssueNumber(args.query) } }
        ];
      }
      
      if (args.filter?.project?.id?.eq) {
        filter.project = { id: { eq: args.filter.project.id.eq } };
      }
      if (args.teamIds) {
        filter.team = { id: { in: args.teamIds } };
      }
      if (args.assigneeIds) {
        filter.assignee = { id: { in: args.assigneeIds } };
      }
      if (args.states) {
        filter.state = { name: { in: args.states } };
      }
      if (typeof args.priority === 'number') {
        filter.priority = { eq: args.priority };
      }

      const result = await client.searchIssues(
        filter,
        args.first || 50,
        args.after,
        args.orderBy || 'updatedAt'
      ) as SearchIssuesResponse;

      return this.createJsonResponse(result);
    } catch (error) {
      this.handleError(error, 'search issues');
    }
  }

  /**
   * Helper method to extract the issue number from an identifier (e.g., "IDE-11" -> 11)
   */
  private extractIssueNumber(query: string): number | null {
    const match = query.match(/^[A-Z]+-(\d+)$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * Deletes a single issue.
   */
  async handleDeleteIssue(args: DeleteIssueInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['id']);

      const result = await client.deleteIssue(args.id) as DeleteIssueResponse;

      if (!result.issueDelete.success) {
        throw new Error('Failed to delete issue');
      }

      return this.createResponse(`Successfully deleted issue ${args.id}`);
    } catch (error) {
      this.handleError(error, 'delete issue');
    }
  }

  /**
   * Deletes multiple issues in bulk.
   */
  async handleDeleteIssues(args: DeleteIssuesInput): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['ids']);

      if (!Array.isArray(args.ids)) {
        throw new Error('Ids parameter must be an array');
      }

      const result = await client.deleteIssues(args.ids) as DeleteIssueResponse;

      if (!result.issueDelete.success) {
        throw new Error('Failed to delete issues');
      }

      return this.createResponse(
        `Successfully deleted ${args.ids.length} issues: ${args.ids.join(', ')}`
      );
    } catch (error) {
      this.handleError(error, 'delete issues');
    }
  }

  /**
   * Creates a relationship between two issues (parent/child, blocks, depends on, etc.)
   */
  async handleLinkIssues(args: { issueId: string; relatedIssueId: string; type: string }): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issueId', 'relatedIssueId', 'type']);

      // Validate relationship type
      const validTypes = ['blocks', 'related', 'duplicate'];
      if (!validTypes.includes(args.type)) {
        throw new Error(`Invalid relationship type. Must be one of: ${validTypes.join(', ')}`);
      }

      const result = await client.createIssueRelation({
        issueId: args.issueId,
        relatedIssueId: args.relatedIssueId,
        type: args.type
      }) as any;

      if (!result.issueRelationCreate.success) {
        throw new Error('Failed to create issue relationship');
      }

      const relation = result.issueRelationCreate.issueRelation;

      return this.createResponse(
        `Successfully created relationship\n` +
        `Relationship: ${relation.issue.identifier} ${args.type} ${relation.relatedIssue.identifier}\n` +
        `Type: ${relation.type}`
      );
    } catch (error) {
      this.handleError(error, 'link issues');
    }
  }

  /**
   * Removes a relationship between two issues.
   */
  async handleUnlinkIssues(args: { relationId: string }): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['relationId']);

      const result = await client.deleteIssueRelation(args.relationId) as any;

      if (!result.issueRelationDelete.success) {
        throw new Error('Failed to delete issue relationship');
      }

      return this.createResponse(`Successfully removed issue relationship`);
    } catch (error) {
      this.handleError(error, 'unlink issues');
    }
  }

  /**
   * Assigns or removes a project milestone from an issue.
   * Pass null or empty milestoneId to remove milestone assignment.
   */
  async handleUpdateIssueMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['issueId']);

      const updateInput: UpdateIssueInput = {};

      // Handle milestone assignment or removal
      if (args.milestoneId !== undefined && args.milestoneId !== null && args.milestoneId !== '') {
        updateInput.projectMilestoneId = args.milestoneId;
      } else {
        // null or empty string = remove milestone
        updateInput.projectMilestoneId = null;
      }

      // Use existing updateIssue for the actual update
      const result = await client.updateIssue(args.issueId, updateInput) as UpdateIssuesResponse;

      if (!result.issueUpdate.success) {
        throw new Error('Failed to update issue milestone');
      }

      const updatedIssue = result.issueUpdate.issue;
      const action = args.milestoneId ? 'assigned to' : 'removed from';

      return this.createResponse(
        `Milestone ${action} issue ${updatedIssue.identifier}\n` +
        `Issue: ${updatedIssue.title}\n` +
        `URL: ${updatedIssue.url}`
      );
    } catch (error) {
      this.handleError(error, 'update issue milestone');
    }
  }
}
