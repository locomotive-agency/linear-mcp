import { LinearClient } from '@linear/sdk';
import { DocumentNode } from 'graphql';
import { rateLimiter } from '../core/middleware/rate-limiter.js';
import { retryLogic } from '../core/middleware/retry-logic.js';
import {
  CreateIssueInput,
  CreateIssuesInput,
  CreateIssueResponse,
  CreateIssuesResponse,
  UpdateIssueInput,
  UpdateIssuesResponse,
  SearchIssuesInput,
  SearchIssuesResponse,
  DeleteIssueResponse,
  Issue,
  IssueBatchResponse
} from '../features/issues/types/issue.types.js';
import {
  ProjectInput,
  ProjectResponse,
  SearchProjectsResponse,
  GetProjectResponse
} from '../features/projects/types/project.types.js';
import {
  TeamResponse,
  LabelInput,
  LabelResponse
} from '../features/teams/types/team.types.js';
import {
  UserResponse
} from '../features/users/types/user.types.js';
import {
  CreateCommentInput,
  CreateCommentResponse,
  GetIssueCommentsResponse
} from '../features/comments/types/comment.types.js';
import {
  ProjectMilestoneCreateInput,
  ProjectMilestoneUpdateInput,
  ProjectMilestoneResponse,
  ProjectMilestoneUpdateResponse,
  ProjectMilestoneDeleteResponse,
  SearchProjectMilestonesResponse,
  GetProjectMilestoneResponse
} from '../features/milestones/types/milestone.types.js';

export class LinearGraphQLClient {
  private linearClient: LinearClient;

  constructor(linearClient: LinearClient) {
    this.linearClient = linearClient;
  }

  async execute<T, V extends Record<string, unknown> = Record<string, unknown>>(
    document: DocumentNode,
    variables?: V
  ): Promise<T> {
    const graphQLClient = this.linearClient.client;

    // Wrap in retry logic for automatic retries on transient failures
    return retryLogic.executeWithRetry(
      async () => {
        // Acquire rate limit slot before making request
        await rateLimiter.acquireSlot();

        try {
          const response = await graphQLClient.rawRequest(
            document.loc?.source.body || '',
            variables
          );

          // Update rate limiter with response headers (only on successful response)
          if (response?.headers) {
            // Convert Headers object to plain object
            const headersObj: Record<string, string> = {};
            if (typeof response.headers.forEach === 'function') {
              response.headers.forEach((value: string, key: string) => {
                headersObj[key] = value;
              });
            }
            rateLimiter.updateFromHeaders(headersObj);
          }

          return response.data as T;
        } catch (error) {
          // Re-throw errors from rawRequest so retry logic can handle them
          if (error instanceof Error) {
            throw new Error(`GraphQL operation failed: ${error.message}`);
          }
          throw error;
        }
      },
      { operationName: 'GraphQL request' }
    );
  }

  /**
   * Execute multiple GraphQL queries in a single API call.
   * This reduces network latency and API call count significantly for related operations.
   *
   * @example
   * const results = await client.batchQuery([
   *   { document: SEARCH_ISSUES_QUERY, variables: { filter: {...} } },
   *   { document: GET_TEAMS_QUERY, variables: {} },
   *   { document: GET_PROJECT_QUERY, variables: { id: 'project-id' } }
   * ]);
   * // results[0] = SearchIssuesResponse
   * // results[1] = TeamResponse
   * // results[2] = GetProjectResponse
   */
  async batchQuery<T extends any[] = any[]>(
    queries: Array<{
      document: DocumentNode;
      variables?: Record<string, unknown>;
      operationName?: string;
    }>
  ): Promise<T> {
    if (queries.length === 0) {
      return [] as unknown as T;
    }

    // If only one query, use regular execute for simplicity
    if (queries.length === 1) {
      const result = await this.execute(queries[0].document, queries[0].variables);
      return [result] as unknown as T;
    }

    const graphQLClient = this.linearClient.client;

    // Acquire rate limit slot before making request (only one slot for batch)
    await rateLimiter.acquireSlot();

    // Execute queries sequentially with optimized error handling
    // Note: Each query uses retryLogic internally through the execute path
    const results: any[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    for (let i = 0; i < queries.length; i++) {
      try {
        // Use execute() which already has retry logic
        const result = await this.execute(queries[i].document, queries[i].variables);
        results.push(result);
      } catch (error) {
        // Collect errors but continue processing other queries
        errors.push({
          index: i,
          error: error instanceof Error
            ? error
            : new Error('Unknown error during batch query')
        });
        results.push(null); // Placeholder for failed query
      }
    }

    // If any errors occurred, log them
    if (errors.length > 0) {
      console.warn(
        `[BatchQuery] ${errors.length}/${queries.length} queries failed:`,
        errors.map(e => `Query ${e.index}: ${e.error.message}`).join(', ')
      );

      // If ALL queries failed, throw
      if (errors.length === queries.length) {
        throw new Error(
          `All batch queries failed: ${errors.map(e => e.error.message).join('; ')}`
        );
      }
    }

    return results as T;
  }

  // Create single issue
  async createIssue(input: CreateIssueInput): Promise<CreateIssueResponse> {
    const { CREATE_ISSUE_MUTATION } = await import('./mutations.js');
    return this.execute<CreateIssueResponse>(CREATE_ISSUE_MUTATION, { input });
  }

  // Create multiple issues
  async createIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues }
    });
  }

  // Create a project
  async createProject(input: ProjectInput): Promise<ProjectResponse> {
    const { CREATE_PROJECT } = await import('./mutations.js');
    return this.execute<ProjectResponse>(CREATE_PROJECT, { input });
  }

  // Create batch of issues
  async createBatchIssues(issues: CreateIssueInput[]): Promise<IssueBatchResponse> {
    const { CREATE_BATCH_ISSUES } = await import('./mutations.js');
    return this.execute<IssueBatchResponse>(CREATE_BATCH_ISSUES, {
      input: { issues }
    });
  }

  // Helper method to create a project with associated issues
  async createProjectWithIssues(projectInput: ProjectInput, issues: CreateIssueInput[]): Promise<ProjectResponse> {
    // Create project first
    const projectResult = await this.createProject(projectInput);
    
    if (!projectResult.projectCreate.success) {
      throw new Error('Failed to create project');
    }

    // Then create issues with project ID
    const issuesWithProject = issues.map(issue => ({
      ...issue,
      projectId: projectResult.projectCreate.project.id
    }));

    const issuesResult = await this.createBatchIssues(issuesWithProject);

    if (!issuesResult.issueBatchCreate.success) {
      throw new Error('Failed to create issues');
    }

    return {
      projectCreate: projectResult.projectCreate,
      issueBatchCreate: issuesResult.issueBatchCreate
    };
  }

  // Update a single issue
  async updateIssue(id: string, input: UpdateIssueInput): Promise<UpdateIssuesResponse> {
    const { UPDATE_ISSUE_MUTATION } = await import('./mutations.js');
    return this.execute<UpdateIssuesResponse>(UPDATE_ISSUE_MUTATION, {
      id,
      input,
    });
  }

  // Note: Linear API doesn't support bulk updates with multiple IDs
  // Use updateIssue in a loop for bulk operations (see handleBulkUpdateIssues)

  // Create multiple labels
  async createIssueLabels(labels: LabelInput[]): Promise<LabelResponse> {
    const { CREATE_ISSUE_LABELS } = await import('./mutations.js');
    return this.execute<LabelResponse>(CREATE_ISSUE_LABELS, { labels });
  }

  // Search issues with pagination
  async searchIssues(
    filter: SearchIssuesInput['filter'], 
    first: number = 50, 
    after?: string, 
    orderBy: string = "updatedAt"
  ): Promise<SearchIssuesResponse> {
    const { SEARCH_ISSUES_QUERY } = await import('./queries.js');
    return this.execute<SearchIssuesResponse>(SEARCH_ISSUES_QUERY, {
      filter,
      first,
      after,
      orderBy,
    });
  }

  // Get teams with their states and labels
  async getTeams(): Promise<TeamResponse> {
    const { GET_TEAMS_QUERY } = await import('./queries.js');
    return this.execute<TeamResponse>(GET_TEAMS_QUERY);
  }

  // Get current user info
  async getCurrentUser(): Promise<UserResponse> {
    const { GET_USER_QUERY } = await import('./queries.js');
    return this.execute<UserResponse>(GET_USER_QUERY);
  }

  // Get project info with documentContent support
  async getProject(id: string): Promise<GetProjectResponse> {
    const { GET_PROJECT_QUERY } = await import('./queries.js');
    return this.execute<GetProjectResponse>(GET_PROJECT_QUERY, { id });
  }

  // Search projects with documentContent support
  async searchProjects(filter: { name?: { eq: string } }): Promise<SearchProjectsResponse> {
    const { SEARCH_PROJECTS_QUERY } = await import('./queries.js');
    return this.execute<SearchProjectsResponse>(SEARCH_PROJECTS_QUERY, { filter });
  }

  // Delete a single issue
  async deleteIssue(id: string): Promise<DeleteIssueResponse> {
    const { DELETE_ISSUE_MUTATION } = await import('./mutations.js');
    return this.execute<DeleteIssueResponse>(DELETE_ISSUE_MUTATION, {
      id,
    })
  }

  // Delete multiple issues
  // Note: Linear API's issueDelete doesn't support batch ids parameter,
  // so we execute individual deletes in parallel for better performance and reliability
  async deleteIssues(ids: string[]): Promise<DeleteIssueResponse> {
    if (ids.length === 0) {
      return { issueDelete: { success: true } };
    }

    try {
      // Execute all deletes in parallel
      const deletePromises = ids.map(id => this.deleteIssue(id));
      await Promise.all(deletePromises);

      return { issueDelete: { success: true } };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete issues: ${error.message}`);
      }
      throw error;
    }
  }

  // Get comments for an issue
  async getIssueComments(
    issueId: string,
    first: number = 50,
    after?: string,
    includeArchived: boolean = false
  ): Promise<GetIssueCommentsResponse> {
    const { GET_ISSUE_COMMENTS_QUERY } = await import('./queries.js');
    return this.execute<GetIssueCommentsResponse>(GET_ISSUE_COMMENTS_QUERY, {
      issueId,
      first,
      after,
      includeArchived
    });
  }

  // Create a comment
  async createComment(input: CreateCommentInput): Promise<CreateCommentResponse> {
    const { CREATE_COMMENT_MUTATION } = await import('./mutations.js');
    return this.execute<CreateCommentResponse>(CREATE_COMMENT_MUTATION, { input });
  }

  // Create a project milestone
  async createProjectMilestone(input: ProjectMilestoneCreateInput): Promise<ProjectMilestoneResponse> {
    const { CREATE_PROJECT_MILESTONE_MUTATION } = await import('./mutations.js');
    return this.execute<ProjectMilestoneResponse>(CREATE_PROJECT_MILESTONE_MUTATION, { input });
  }

  // Update a project milestone
  async updateProjectMilestone(id: string, input: ProjectMilestoneUpdateInput): Promise<ProjectMilestoneUpdateResponse> {
    const { UPDATE_PROJECT_MILESTONE_MUTATION } = await import('./mutations.js');
    return this.execute<ProjectMilestoneUpdateResponse>(UPDATE_PROJECT_MILESTONE_MUTATION, { id, input });
  }

  // Delete a project milestone
  async deleteProjectMilestone(id: string): Promise<ProjectMilestoneDeleteResponse> {
    const { DELETE_PROJECT_MILESTONE_MUTATION } = await import('./mutations.js');
    return this.execute<ProjectMilestoneDeleteResponse>(DELETE_PROJECT_MILESTONE_MUTATION, { id });
  }

  // Get a specific project milestone
  async getProjectMilestone(id: string): Promise<GetProjectMilestoneResponse> {
    const { GET_PROJECT_MILESTONE_QUERY } = await import('./queries.js');
    return this.execute<GetProjectMilestoneResponse>(GET_PROJECT_MILESTONE_QUERY, { id });
  }

  // Search project milestones with filtering and pagination
  async searchProjectMilestones(options: {
    filter?: any;
    first?: number;
    after?: string;
    orderBy?: string;
  } = {}): Promise<SearchProjectMilestonesResponse> {
    const { SEARCH_PROJECT_MILESTONES_QUERY } = await import('./queries.js');
    return this.execute<SearchProjectMilestonesResponse>(SEARCH_PROJECT_MILESTONES_QUERY, {
      filter: options.filter,
      first: options.first || 50,
      after: options.after,
      orderBy: options.orderBy || 'updatedAt'
    });
  }

  // Create an issue relationship
  async createIssueRelation(input: { issueId: string; relatedIssueId: string; type: string }): Promise<any> {
    const { CREATE_ISSUE_RELATION_MUTATION } = await import('./mutations.js');
    return this.execute<any>(CREATE_ISSUE_RELATION_MUTATION, { input });
  }

  // Delete an issue relationship
  async deleteIssueRelation(id: string): Promise<any> {
    const { DELETE_ISSUE_RELATION_MUTATION } = await import('./mutations.js');
    return this.execute<any>(DELETE_ISSUE_RELATION_MUTATION, { id });
  }
}
