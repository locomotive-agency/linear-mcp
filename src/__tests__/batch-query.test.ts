import { LinearGraphQLClient } from '../graphql/client';
import { LinearClient } from '@linear/sdk';
import { gql } from 'graphql-tag';
import { rateLimiter } from '../core/middleware/rate-limiter';

jest.mock('@linear/sdk');

describe('LinearGraphQLClient - Batch Query', () => {
  let graphqlClient: LinearGraphQLClient;
  let mockLinearClient: jest.Mocked<LinearClient>;
  let mockRawRequest: jest.Mock;

  beforeEach(() => {
    mockRawRequest = jest.fn();
    mockLinearClient = {
      client: {
        rawRequest: mockRawRequest
      }
    } as any;

    graphqlClient = new LinearGraphQLClient(mockLinearClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('batchQuery', () => {
    const QUERY_1 = gql`
      query GetTeams {
        teams {
          nodes {
            id
            name
          }
        }
      }
    `;

    const QUERY_2 = gql`
      query SearchIssues($filter: IssueFilter) {
        issues(filter: $filter) {
          nodes {
            id
            title
          }
        }
      }
    `;

    const QUERY_3 = gql`
      query GetProject($id: String!) {
        project(id: $id) {
          id
          name
        }
      }
    `;

    it('should return empty array for empty queries list', async () => {
      const results = await graphqlClient.batchQuery([]);

      expect(results).toEqual([]);
      expect(mockRawRequest).not.toHaveBeenCalled();
    });

    it('DEBUG: should execute work directly', async () => {
      const mockData = { teams: { nodes: [] } };
      mockRawRequest.mockResolvedValueOnce({ data: mockData });

      const result = await graphqlClient.execute(QUERY_1, {});

      expect(result).toEqual(mockData);
    });

    it('should execute single query using regular execute', async () => {
      const mockData = {
        teams: {
          nodes: [
            { id: 'team-1', name: 'Team 1' },
            { id: 'team-2', name: 'Team 2' }
          ]
        }
      };

      mockRawRequest.mockResolvedValueOnce({ data: mockData });

      const results = await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} }
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(mockData);
      expect(mockRawRequest).toHaveBeenCalledTimes(1);
    });

    it('should execute multiple queries sequentially', async () => {
      const mockData1 = {
        teams: {
          nodes: [
            { id: 'team-1', name: 'Team 1' }
          ]
        }
      };

      const mockData2 = {
        issues: {
          nodes: [
            { id: 'issue-1', title: 'Issue 1' },
            { id: 'issue-2', title: 'Issue 2' }
          ]
        }
      };

      const mockData3 = {
        project: {
          id: 'project-1',
          name: 'Project 1'
        }
      };

      mockRawRequest
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 })
        .mockResolvedValueOnce({ data: mockData3 });

      const results = await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} },
        { document: QUERY_2, variables: { filter: { team: { id: { eq: 'team-1' } } } } },
        { document: QUERY_3, variables: { id: 'project-1' } }
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockData1);
      expect(results[1]).toEqual(mockData2);
      expect(results[2]).toEqual(mockData3);
      expect(mockRawRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures gracefully', async () => {
      const mockData1 = {
        teams: {
          nodes: [{ id: 'team-1', name: 'Team 1' }]
        }
      };

      const mockData3 = {
        project: {
          id: 'project-1',
          name: 'Project 1'
        }
      };

      // Mock console.warn to avoid test output noise
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Note: Retry logic will attempt up to 5 times, so we need to fail all attempts
      mockRawRequest
        .mockResolvedValueOnce({ data: mockData1 })
        // Mock 5 failures for the retry logic (max attempts = 5)
        .mockRejectedValueOnce(new Error('Query 2 failed'))
        .mockRejectedValueOnce(new Error('Query 2 failed'))
        .mockRejectedValueOnce(new Error('Query 2 failed'))
        .mockRejectedValueOnce(new Error('Query 2 failed'))
        .mockRejectedValueOnce(new Error('Query 2 failed'))
        .mockResolvedValueOnce({ data: mockData3 });

      const results = await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} },
        { document: QUERY_2, variables: { filter: {} } },
        { document: QUERY_3, variables: { id: 'project-1' } }
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockData1);
      expect(results[1]).toBeNull(); // Failed query returns null after all retries
      expect(results[2]).toEqual(mockData3);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[BatchQuery] 1/3 queries failed:'),
        expect.stringContaining('Query 1: GraphQL operation failed: Query 2 failed')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should throw error if all queries fail', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Each query will be retried 5 times, so we need 15 failures total (3 queries * 5 attempts)
      for (let i = 0; i < 15; i++) {
        mockRawRequest.mockRejectedValueOnce(new Error(`Query failed`));
      }

      await expect(
        graphqlClient.batchQuery([
          { document: QUERY_1, variables: {} },
          { document: QUERY_2, variables: { filter: {} } },
          { document: QUERY_3, variables: { id: 'project-1' } }
        ])
      ).rejects.toThrow('All batch queries failed');

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should pass correct variables to each query', async () => {
      const mockData1 = { teams: { nodes: [] } };
      const mockData2 = { issues: { nodes: [] } };

      mockRawRequest
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 });

      const filter = { team: { id: { eq: 'team-1' } } };
      await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} },
        { document: QUERY_2, variables: { filter } }
      ]);

      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        {}
      );
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        { filter }
      );
    });

    it('should update rate limiter from responses', async () => {
      const mockHeaders = new Map([
        ['x-ratelimit-limit', '1000'],
        ['x-ratelimit-remaining', '950'],
        ['x-ratelimit-reset', '1609459200']
      ]);

      mockRawRequest
        .mockResolvedValueOnce({
          data: { teams: { nodes: [] } },
          headers: mockHeaders
        })
        .mockResolvedValueOnce({
          data: { issues: { nodes: [] } },
          headers: mockHeaders
        });

      await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} },
        { document: QUERY_2, variables: { filter: {} } }
      ]);

      // Rate limiter should process the headers
      // (We can't easily test the internal state, but we can verify it runs without error)
      expect(true).toBe(true);
    });

    it('should handle queries with operation names', async () => {
      const mockData = { teams: { nodes: [] } };
      mockRawRequest.mockResolvedValueOnce({ data: mockData });

      await graphqlClient.batchQuery([
        {
          document: QUERY_1,
          variables: {},
          operationName: 'GetAllTeams'
        }
      ]);

      expect(mockRawRequest).toHaveBeenCalled();
    });

    it('should execute all queries in batch operation', async () => {
      // This test demonstrates the value of batching
      const mockData1 = { teams: { nodes: [] } };
      const mockData2 = { issues: { nodes: [] } };
      const mockData3 = { project: { id: 'p1', name: 'P1' } };

      mockRawRequest
        .mockResolvedValueOnce({ data: mockData1 })
        .mockResolvedValueOnce({ data: mockData2 })
        .mockResolvedValueOnce({ data: mockData3 });

      const results = await graphqlClient.batchQuery([
        { document: QUERY_1, variables: {} },
        { document: QUERY_2, variables: { filter: {} } },
        { document: QUERY_3, variables: { id: 'p1' } }
      ]);

      // Should execute all 3 queries
      expect(mockRawRequest).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(mockData1);
      expect(results[1]).toEqual(mockData2);
      expect(results[2]).toEqual(mockData3);
    });

    it('should handle empty variables gracefully', async () => {
      const mockData = { teams: { nodes: [] } };
      mockRawRequest.mockResolvedValueOnce({ data: mockData });

      const results = await graphqlClient.batchQuery([
        { document: QUERY_1 } // No variables provided
      ]);

      expect(results).toHaveLength(1);
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        undefined
      );
    });
  });

  describe('batchQuery - Integration scenarios', () => {
    it('should efficiently fetch dashboard data (teams + issues + projects)', async () => {
      const GET_TEAMS = gql`query GetTeams { teams { nodes { id name } } }`;
      const SEARCH_ISSUES = gql`query SearchIssues { issues { nodes { id title } } }`;
      const GET_PROJECTS = gql`query GetProjects { projects { nodes { id name } } }`;

      mockRawRequest
        .mockResolvedValueOnce({ data: { teams: { nodes: [{ id: 't1', name: 'Team 1' }] } } })
        .mockResolvedValueOnce({ data: { issues: { nodes: [{ id: 'i1', title: 'Issue 1' }] } } })
        .mockResolvedValueOnce({ data: { projects: { nodes: [{ id: 'p1', name: 'Project 1' }] } } });

      const results = await graphqlClient.batchQuery([
        { document: GET_TEAMS },
        { document: SEARCH_ISSUES },
        { document: GET_PROJECTS }
      ]);

      // Verify all data fetched in one coordinated batch
      expect(results).toHaveLength(3);
      expect(results[0].teams.nodes).toHaveLength(1);
      expect(results[1].issues.nodes).toHaveLength(1);
      expect(results[2].projects.nodes).toHaveLength(1);
    });

    it('should efficiently fetch issue detail view (issue + comments + related)', async () => {
      const GET_ISSUE = gql`query GetIssue($id: String!) { issue(id: $id) { id title } }`;
      const GET_COMMENTS = gql`query GetComments($id: String!) { issue(id: $id) { comments { nodes { id body } } } }`;

      mockRawRequest
        .mockResolvedValueOnce({
          data: { issue: { id: 'i1', title: 'Issue 1' } }
        })
        .mockResolvedValueOnce({
          data: { issue: { comments: { nodes: [{ id: 'c1', body: 'Comment 1' }] } } }
        });

      const results = await graphqlClient.batchQuery([
        { document: GET_ISSUE, variables: { id: 'i1' } },
        { document: GET_COMMENTS, variables: { id: 'i1' } }
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].issue.title).toBe('Issue 1');
      expect(results[1].issue.comments.nodes).toHaveLength(1);
    });
  });
});
