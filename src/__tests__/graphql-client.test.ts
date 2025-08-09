import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { LinearGraphQLClient } from '../graphql/client';
import { LinearClient } from '@linear/sdk';
import { 
  CreateIssueInput, 
  CreateIssueResponse,
  CreateIssuesResponse,
  UpdateIssueInput,
  UpdateIssuesResponse,
  SearchIssuesInput,
  SearchIssuesResponse,
  DeleteIssueResponse,
  IssueBatchResponse
} from '../features/issues/types/issue.types';
import {
  ProjectInput,
  ProjectResponse,
  SearchProjectsResponse,
  GetProjectResponse
} from '../features/projects/types/project.types';
import {
  TeamResponse,
  LabelInput,
  LabelResponse
} from '../features/teams/types/team.types';
import {
  UserResponse
} from '../features/users/types/user.types';
import {
  ProjectMilestoneCreateInput,
  ProjectMilestoneUpdateInput,
  ProjectMilestoneResponse,
  ProjectMilestoneUpdateResponse,
  ProjectMilestoneDeleteResponse,
  SearchProjectMilestonesResponse,
  GetProjectMilestoneResponse
} from '../features/milestones/types/milestone.types';

jest.mock('@linear/sdk');

// Define type for GraphQL response
type GraphQLResponse<T> = {
  data: T;
};

describe('LinearGraphQLClient', () => {
  let graphqlClient: LinearGraphQLClient;
  let linearClient: LinearClient;
  let mockRawRequest: jest.MockedFunction<(query: string, variables?: Record<string, unknown>) => Promise<GraphQLResponse<unknown>>>;

  beforeEach(() => {
    mockRawRequest = jest.fn();
    // Mock the Linear client's GraphQL client
    linearClient = {
      client: {
        rawRequest: mockRawRequest
      }
    } as unknown as LinearClient;

    // Clear mocks
    mockRawRequest.mockReset();

    graphqlClient = new LinearGraphQLClient(linearClient);
  });

  describe('searchIssues', () => {
    it('should successfully search issues with project filter', async () => {
      const mockResponse = {
        data: {
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'issue-1',
                identifier: 'TEST-1',
                title: 'Test Issue 1',
                url: 'https://linear.app/test/issue/TEST-1'
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const searchInput = {
        filter: {
          project: {
            id: {
              eq: 'project-1'
            }
          }
        },
        first: 1
      };

      const result: SearchIssuesResponse = await graphqlClient.searchIssues(
        searchInput.filter,
        searchInput.first
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: searchInput.filter
        })
      );
    });

    it('should successfully search issues with text query', async () => {
      const mockResponse = {
        data: {
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'issue-1',
                identifier: 'TEST-1',
                title: 'Bug in search feature',
                url: 'https://linear.app/test/issue/TEST-1'
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      // This simulates what our handler would create for a text search
      const filter: Record<string, unknown> = {
        or: [
          { title: { containsIgnoreCase: 'search' } },
          { number: { eq: null } }
        ]
      };

      const result: SearchIssuesResponse = await graphqlClient.searchIssues(
        filter,
        10
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: filter
        })
      );
    });

    it('should successfully search issues with issue identifier', async () => {
      const mockResponse = {
        data: {
          issues: {
            pageInfo: {
              hasNextPage: false,
              endCursor: null
            },
            nodes: [
              {
                id: 'issue-1',
                identifier: 'TEST-123',
                title: 'Test Issue 123',
                url: 'https://linear.app/test/issue/TEST-123'
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      // This simulates what our handler would create for an identifier search
      const filter: Record<string, unknown> = {
        or: [
          { title: { containsIgnoreCase: 'TEST-123' } },
          { number: { eq: 123 } }
        ]
      };

      const result: SearchIssuesResponse = await graphqlClient.searchIssues(
        filter,
        10
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: filter
        })
      );
    });

    it('should handle search errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('Search failed'));

      const searchInput = {
        filter: {
          project: {
            id: {
              eq: 'project-1'
            }
          }
        }
      };

      await expect(
        graphqlClient.searchIssues(searchInput.filter)
      ).rejects.toThrow('GraphQL operation failed: Search failed');
    });
  });

  describe('createIssue', () => {
    it('should successfully create an issue', async () => {
      const mockResponse = {
        data: {
          issueCreate: {
            success: true,
            issue: {
              id: 'issue-1',
              identifier: 'TEST-1',
              title: 'New Issue',
              url: 'https://linear.app/test/issue/TEST-1'
            }
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const input: CreateIssueInput = {
        title: 'New Issue',
        description: 'Description',
        teamId: 'team-1'
      };
      
      const result: CreateIssueResponse = await graphqlClient.createIssue(input);

      // Verify single mutation call with direct input (not array)
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: input
        })
      );

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('Creation failed'));

      const input: CreateIssueInput = {
        title: 'New Issue',
        description: 'Description',
        teamId: 'team-1'
      };

      await expect(
        graphqlClient.createIssue(input)
      ).rejects.toThrow('GraphQL operation failed: Creation failed');
    });
  });

  describe('Project Operations', () => {
    describe('createProject', () => {
      it('should successfully create a project', async () => {
        const mockResponse = {
          data: {
            projectCreate: {
              success: true,
              project: {
                id: 'project-1',
                name: 'New Project',
                url: 'https://linear.app/test/project/1',
                description: '',
                documentContent: {
                  content: 'This is the actual project description',
                  contentState: '{"type":"doc","content":[]}'
                }
              },
              lastSyncId: 123
            }
          }
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const projectInput: ProjectInput = {
          name: 'New Project',
          teamIds: ['team-1']
        };

        const result = await graphqlClient.createProject(projectInput);
        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ input: projectInput })
        );
      });
    });

    describe('getProject', () => {
      it('should successfully get a project with documentContent', async () => {
        const mockResponse = {
          data: {
            project: {
              id: 'project-1',
              name: 'Test Project',
              description: '',
              documentContent: {
                content: 'This is the rich text description',
                contentState: '{"type":"doc","content":[]}'
              },
              url: 'https://linear.app/test/project/1',
              teams: {
                nodes: [
                  {
                    id: 'team-1',
                    name: 'Engineering'
                  }
                ]
              }
            }
          }
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const result: GetProjectResponse = await graphqlClient.getProject('project-1');
        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ id: 'project-1' })
        );
      });
    });

    describe('searchProjects', () => {
      it('should successfully search projects with documentContent', async () => {
        const mockResponse = {
          data: {
            projects: {
              nodes: [
                {
                  id: 'project-1',
                  name: 'Test Project',
                  description: '',
                  documentContent: {
                    content: 'Rich text project description',
                    contentState: '{"type":"doc","content":[]}'
                  },
                  url: 'https://linear.app/test/project/1',
                  teams: {
                    nodes: [
                      {
                        id: 'team-1',
                        name: 'Engineering'
                      }
                    ]
                  }
                }
              ]
            }
          }
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const result: SearchProjectsResponse = await graphqlClient.searchProjects({
          name: { eq: 'Test Project' }
        });
        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            filter: { name: { eq: 'Test Project' } }
          })
        );
      });
    });

    describe('createProjectWithIssues', () => {
      it('should successfully create project with issues', async () => {
        const projectMockResponse = {
          data: {
            projectCreate: {
              success: true,
              project: {
                id: 'project-1',
                name: 'New Project',
                url: 'https://linear.app/test/project/1',
                description: '',
                documentContent: {
                  content: 'Project description content',
                  contentState: '{"type":"doc","content":[]}'
                }
              },
              lastSyncId: 123
            }
          }
        };

        const issueMockResponse = {
          data: {
            issueBatchCreate: {
              success: true,
              issues: [
                {
                  id: 'issue-1',
                  identifier: 'TEST-1',
                  title: 'Project Issue 1',
                  url: 'https://linear.app/test/issue/TEST-1'
                }
              ],
              lastSyncId: 124
            }
          }
        };

        mockRawRequest
          .mockResolvedValueOnce(projectMockResponse)
          .mockResolvedValueOnce(issueMockResponse);

        const projectInput: ProjectInput = {
          name: 'New Project',
          teamIds: ['team-1']
        };

        const issueInput: CreateIssueInput = {
          title: 'Project Issue 1',
          description: 'Description 1',
          teamId: 'team-1'
        };

        const result = await graphqlClient.createProjectWithIssues(
          projectInput,
          [issueInput]
        );

        expect(result).toEqual({
          projectCreate: projectMockResponse.data.projectCreate,
          issueBatchCreate: issueMockResponse.data.issueBatchCreate
        });

        // Verify project creation call
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ input: projectInput })
        );

        // Verify issue creation call
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            input: {
              issues: [{ ...issueInput, projectId: 'project-1' }]
            }
          })
        );
      });

      it('should handle project creation errors', async () => {
        const errorResponse = {
          data: {
            projectCreate: {
              success: false,
              project: null,
              lastSyncId: 123
            }
          }
        };

        mockRawRequest.mockResolvedValueOnce(errorResponse);

        const projectInput: ProjectInput = {
          name: 'New Project',
          teamIds: ['team-1']
        };

        const issueInput: CreateIssueInput = {
          title: 'Project Issue 1',
          description: 'Description 1',
          teamId: 'team-1'
        };

        await expect(
          graphqlClient.createProjectWithIssues(projectInput, [issueInput])
        ).rejects.toThrow('Failed to create project');
      });

      it('should handle issue creation errors', async () => {
        const projectResponse = {
          data: {
            projectCreate: {
              success: true,
              project: {
                id: 'project-1',
                name: 'New Project',
                url: 'https://linear.app/test/project/1'
              },
              lastSyncId: 123
            }
          }
        };

        const errorResponse = {
          data: {
            issueBatchCreate: {
              success: false,
              issues: [],
              lastSyncId: 124
            }
          }
        };

        mockRawRequest
          .mockResolvedValueOnce(projectResponse)
          .mockResolvedValueOnce(errorResponse);

        const projectInput: ProjectInput = {
          name: 'New Project',
          teamIds: ['team-1']
        };

        const issueInput: CreateIssueInput = {
          title: 'Project Issue 1',
          description: 'Description 1',
          teamId: 'team-1'
        };

        await expect(
          graphqlClient.createProjectWithIssues(projectInput, [issueInput])
        ).rejects.toThrow('Failed to create issues');
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should create multiple issues with a single mutation', async () => {
      const mockResponse = {
        data: {
          issueCreate: {
            success: true,
            issues: [
              {
                id: 'issue-1',
                identifier: 'TEST-1',
                title: 'Issue 1',
                url: 'https://linear.app/test/issue/TEST-1'
              },
              {
                id: 'issue-2',
                identifier: 'TEST-2',
                title: 'Issue 2',
                url: 'https://linear.app/test/issue/TEST-2'
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const issues: CreateIssueInput[] = [
        {
          title: 'Issue 1',
          description: 'Description 1',
          teamId: 'team-1'
        },
        {
          title: 'Issue 2',
          description: 'Description 2',
          teamId: 'team-1'
        }
      ];

      const result: IssueBatchResponse = await graphqlClient.createIssues(issues);

      expect(result).toEqual(mockResponse.data);
      // Verify single mutation call
      expect(mockRawRequest).toHaveBeenCalledTimes(1);
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: { issues }
        })
      );
    });

    it('should update multiple issues with a single mutation', async () => {
      const mockResponse = {
        data: {
          issueUpdate: {
            success: true,
            issues: [
              {
                id: 'issue-1',
                identifier: 'TEST-1',
                title: 'Updated Issue 1',
                url: 'https://linear.app/test/issue/TEST-1'
              },
              {
                id: 'issue-2',
                identifier: 'TEST-2',
                title: 'Updated Issue 2',
                url: 'https://linear.app/test/issue/TEST-2'
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const ids = ['issue-1', 'issue-2'];
      const updateInput: UpdateIssueInput = { stateId: 'state-2' };
      const result: UpdateIssuesResponse = await graphqlClient.updateIssues(ids, updateInput);

      expect(result).toEqual(mockResponse.data);
      // Verify single mutation call
      expect(mockRawRequest).toHaveBeenCalledTimes(1);
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ids,
          input: updateInput
        })
      );
    });

    it('should handle update errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('Update failed'));

      const updateInput: UpdateIssueInput = { stateId: 'state-2' };
      await expect(
        graphqlClient.updateIssues(['issue-1'], updateInput)
      ).rejects.toThrow('GraphQL operation failed: Update failed');
    });

    it('should delete multiple issues with a single mutation', async () => {
      const mockResponse = {
        data: {
          issueDelete: {
            success: true
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const ids = ['issue-1', 'issue-2'];
      const result: DeleteIssueResponse = await graphqlClient.deleteIssues(ids);

      expect(result).toEqual(mockResponse.data);
      // Verify single mutation call
      expect(mockRawRequest).toHaveBeenCalledTimes(1);
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ids
        })
      );
    });
  });

  describe('getTeams', () => {
    it('should successfully fetch teams', async () => {
      const mockResponse = {
        data: {
          teams: {
            nodes: [
              {
                id: 'team-1',
                name: 'Team 1',
                key: 'TEAM1',
                states: [
                  {
                    id: 'state-1',
                    name: 'Todo',
                    type: 'unstarted'
                  }
                ]
              }
            ]
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const result: TeamResponse = await graphqlClient.getTeams();

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
    });

    it('should handle team fetch errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('Team fetch failed'));

      await expect(graphqlClient.getTeams()).rejects.toThrow(
        'GraphQL operation failed: Team fetch failed'
      );
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully fetch current user', async () => {
      const mockResponse = {
        data: {
          viewer: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const result: UserResponse = await graphqlClient.getCurrentUser();

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
    });

    it('should handle user fetch errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('User fetch failed'));

      await expect(graphqlClient.getCurrentUser()).rejects.toThrow(
        'GraphQL operation failed: User fetch failed'
      );
    });
  });

  describe('Label Operations', () => {
    it('should successfully create labels', async () => {
      const mockResponse = {
        data: {
          labelCreate: {
            success: true,
            label: {
              id: 'label-1',
              name: 'bug'
            }
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const labelInput: LabelInput = {
        name: 'bug',
        color: '#FF0000',
        teamId: 'team-1'
      };

      const result: LabelResponse = await graphqlClient.createIssueLabels([labelInput]);

      expect(result).toEqual(mockResponse.data);
      expect(mockRawRequest).toHaveBeenCalled();
    });

    it('should handle label creation errors', async () => {
      mockRawRequest.mockRejectedValueOnce(new Error('Label creation failed'));

      const labelInput: LabelInput = {
        name: 'bug',
        teamId: 'team-1'
      };

      await expect(
        graphqlClient.createIssueLabels([labelInput])
      ).rejects.toThrow('GraphQL operation failed: Label creation failed');
    });
  });

  describe('updateIssue', () => {
    it('should update a single issue', async () => {
      const mockResponse = {
        data: {
          issueUpdate: {
            success: true,
            issue: {
              id: 'issue-1',
              identifier: 'TEST-1',
              title: 'Updated Issue',
              url: 'https://linear.app/test/issue/TEST-1',
              state: {
                name: 'In Progress'
              }
            }
          }
        }
      };

      mockRawRequest.mockResolvedValueOnce(mockResponse);

      const id = 'issue-1';
      const updateInput: UpdateIssueInput = { stateId: 'state-2' };
      const result: UpdateIssuesResponse = await graphqlClient.updateIssue(id, updateInput);

      expect(result).toEqual(mockResponse.data);
      // Verify single mutation call with direct id (not array)
      expect(mockRawRequest).toHaveBeenCalledTimes(1);
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id,
          input: updateInput
        })
      );
    });
  });

  describe("deleteIssue", () => {
    it("should delete a single issue", async () => {
      const mockResponse = {
        data: {
          issueDelete: {
            success: true,
          },
        },
      }

      mockRawRequest.mockResolvedValueOnce(mockResponse)

      const id = "issue-1"
      const result: DeleteIssueResponse = await graphqlClient.deleteIssue(id)

      expect(result).toEqual(mockResponse.data)
      // Verify single mutation call
      expect(mockRawRequest).toHaveBeenCalledTimes(1)
      expect(mockRawRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id,
        })
      )
    })
  })

  describe('Project Milestone Operations', () => {
    describe('createProjectMilestone', () => {
      it('should successfully create a project milestone', async () => {
        const mockResponse = {
          data: {
            projectMilestoneCreate: {
              success: true,
              projectMilestone: {
                id: 'milestone-1',
                name: 'Q1 Milestone',
                description: 'First quarter milestone',
                status: 'unstarted',
                progress: 0,
                project: {
                  id: 'project-1',
                  name: 'Test Project',
                },
                targetDate: '2024-03-31',
              },
              lastSyncId: 123,
            },
          },
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const input: ProjectMilestoneCreateInput = {
          name: 'Q1 Milestone',
          description: 'First quarter milestone',
          projectId: 'project-1',
          targetDate: '2024-03-31',
        };

        const result: ProjectMilestoneResponse = await graphqlClient.createProjectMilestone(input);

        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            input: input
          })
        );
      });

      it('should handle creation errors', async () => {
        mockRawRequest.mockRejectedValueOnce(new Error('Milestone creation failed'));

        const input: ProjectMilestoneCreateInput = {
          name: 'Q1 Milestone',
          projectId: 'project-1',
        };

        await expect(
          graphqlClient.createProjectMilestone(input)
        ).rejects.toThrow('GraphQL operation failed: Milestone creation failed');
      });
    });

    describe('updateProjectMilestone', () => {
      it('should successfully update a project milestone', async () => {
        const mockResponse = {
          data: {
            projectMilestoneUpdate: {
              success: true,
              projectMilestone: {
                id: 'milestone-1',
                name: 'Updated Milestone',
                description: 'Updated description',
                status: 'next',
                progress: 25,
                project: {
                  id: 'project-1',
                  name: 'Test Project',
                },
                targetDate: '2024-04-30',
              },
              lastSyncId: 124,
            },
          },
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const input: ProjectMilestoneUpdateInput = {
          name: 'Updated Milestone',
          description: 'Updated description',
          targetDate: '2024-04-30',
        };

        const result: ProjectMilestoneUpdateResponse = await graphqlClient.updateProjectMilestone('milestone-1', input);

        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            id: 'milestone-1',
            input: input
          })
        );
      });

      it('should handle update errors', async () => {
        mockRawRequest.mockRejectedValueOnce(new Error('Milestone update failed'));

        const input: ProjectMilestoneUpdateInput = {
          name: 'Updated Milestone',
        };

        await expect(
          graphqlClient.updateProjectMilestone('milestone-1', input)
        ).rejects.toThrow('GraphQL operation failed: Milestone update failed');
      });
    });

    describe('deleteProjectMilestone', () => {
      it('should successfully delete a project milestone', async () => {
        const mockResponse = {
          data: {
            projectMilestoneDelete: {
              success: true,
              lastSyncId: 125,
            },
          },
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const result: ProjectMilestoneDeleteResponse = await graphqlClient.deleteProjectMilestone('milestone-1');

        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            id: 'milestone-1'
          })
        );
      });

      it('should handle deletion errors', async () => {
        mockRawRequest.mockRejectedValueOnce(new Error('Milestone deletion failed'));

        await expect(
          graphqlClient.deleteProjectMilestone('milestone-1')
        ).rejects.toThrow('GraphQL operation failed: Milestone deletion failed');
      });
    });

    describe('getProjectMilestone', () => {
      it('should successfully get a project milestone', async () => {
        const mockResponse = {
          data: {
            projectMilestone: {
              id: 'milestone-1',
              name: 'Q1 Milestone',
              description: 'First quarter milestone',
              documentContent: {
                content: 'Rich text content',
              },
              status: 'unstarted',
              progress: 0,
              project: {
                id: 'project-1',
                name: 'Test Project',
              },
              issues: {
                pageInfo: { hasNextPage: false },
                nodes: [],
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
          },
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const result: GetProjectMilestoneResponse = await graphqlClient.getProjectMilestone('milestone-1');

        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            id: 'milestone-1'
          })
        );
      });

      it('should handle get errors', async () => {
        mockRawRequest.mockRejectedValueOnce(new Error('Milestone fetch failed'));

        await expect(
          graphqlClient.getProjectMilestone('milestone-1')
        ).rejects.toThrow('GraphQL operation failed: Milestone fetch failed');
      });
    });

    describe('searchProjectMilestones', () => {
      it('should successfully search project milestones', async () => {
        const mockResponse = {
          data: {
            projectMilestones: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                {
                  id: 'milestone-1',
                  name: 'Q1 Milestone',
                  description: 'First quarter milestone',
                  documentContent: null,
                  status: 'unstarted',
                  progress: 0,
                  project: {
                    id: 'project-1',
                    name: 'Test Project',
                  },
                  issues: {
                    pageInfo: { hasNextPage: false },
                    nodes: [],
                  },
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z',
                },
              ],
            },
          },
        };

        mockRawRequest.mockResolvedValueOnce(mockResponse);

        const result: SearchProjectMilestonesResponse = await graphqlClient.searchProjectMilestones({
          filter: { name: { eq: 'Q1 Milestone' } },
          first: 10,
        });

        expect(result).toEqual(mockResponse.data);
        expect(mockRawRequest).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            filter: { name: { eq: 'Q1 Milestone' } },
            first: 10,
            after: undefined,
            orderBy: 'updatedAt'
          })
        );
      });

      it('should handle search errors', async () => {
        mockRawRequest.mockRejectedValueOnce(new Error('Milestone search failed'));

        await expect(
          graphqlClient.searchProjectMilestones({})
        ).rejects.toThrow('GraphQL operation failed: Milestone search failed');
      });
    });

    describe('createProjectMilestones (bulk)', () => {
      it('should successfully create multiple project milestones', async () => {
        const mockResponses = [
          {
            data: {
              projectMilestoneCreate: {
                success: true,
                projectMilestone: {
                  id: 'milestone-1',
                  name: 'Feature Requirements',
                  description: 'Before we can architect, we need a coherent Feature Requirements document with sign-off from product',
                  status: 'unstarted',
                  progress: 0,
                  project: {
                    id: 'project-1',
                    name: 'Test Project',
                  },
                },
                lastSyncId: 123,
              },
            },
          },
          {
            data: {
              projectMilestoneCreate: {
                success: true,
                projectMilestone: {
                  id: 'milestone-2',
                  name: 'Design Approval',
                  description: 'We need to coordinate with the design team and get sign-off from the product team',
                  status: 'unstarted',
                  progress: 0,
                  project: {
                    id: 'project-1',
                    name: 'Test Project',
                  },
                },
                lastSyncId: 124,
              },
            },
          },
          {
            data: {
              projectMilestoneCreate: {
                success: true,
                projectMilestone: {
                  id: 'milestone-3',
                  name: 'Architecture Approved',
                  description: 'Before we begin execution, we want to get sign-off from the architecture team',
                  status: 'unstarted',
                  progress: 0,
                  project: {
                    id: 'project-1',
                    name: 'Test Project',
                  },
                },
                lastSyncId: 125,
              },
            },
          },
        ];

        mockRawRequest
          .mockResolvedValueOnce(mockResponses[0])
          .mockResolvedValueOnce(mockResponses[1])
          .mockResolvedValueOnce(mockResponses[2]);

        const milestones: ProjectMilestoneCreateInput[] = [
          {
            name: 'Feature Requirements',
            description: 'Before we can architect, we need a coherent Feature Requirements document with sign-off from product',
            projectId: 'project-1',
            sortOrder: 1,
          },
          {
            name: 'Design Approval',
            description: 'We need to coordinate with the design team and get sign-off from the product team',
            projectId: 'project-1',
            sortOrder: 2,
          },
          {
            name: 'Architecture Approved',
            description: 'Before we begin execution, we want to get sign-off from the architecture team',
            projectId: 'project-1',
            sortOrder: 3,
          },
        ];

        // Test the bulk creation by calling createProjectMilestone multiple times
        const results: ProjectMilestoneResponse[] = [];
        for (const milestone of milestones) {
          const result = await graphqlClient.createProjectMilestone(milestone);
          results.push(result);
        }

        expect(results).toHaveLength(3);
        expect(results[0]).toEqual(mockResponses[0].data);
        expect(results[1]).toEqual(mockResponses[1].data);
        expect(results[2]).toEqual(mockResponses[2].data);

        // Verify all three mutations were called
        expect(mockRawRequest).toHaveBeenCalledTimes(3);
        
        // Verify each call had the correct input
        expect(mockRawRequest).toHaveBeenNthCalledWith(1, 
          expect.any(String),
          expect.objectContaining({ input: milestones[0] })
        );
        expect(mockRawRequest).toHaveBeenNthCalledWith(2,
          expect.any(String), 
          expect.objectContaining({ input: milestones[1] })
        );
        expect(mockRawRequest).toHaveBeenNthCalledWith(3,
          expect.any(String),
          expect.objectContaining({ input: milestones[2] })
        );
      });

      it('should handle partial failures in bulk creation', async () => {
        const mockResponses = [
          {
            data: {
              projectMilestoneCreate: {
                success: true,
                projectMilestone: {
                  id: 'milestone-1',
                  name: 'Feature Requirements',
                  status: 'unstarted',
                  progress: 0,
                  project: {
                    id: 'project-1',
                    name: 'Test Project',
                  },
                },
                lastSyncId: 123,
              },
            },
          },
        ];

        mockRawRequest
          .mockResolvedValueOnce(mockResponses[0])
          .mockRejectedValueOnce(new Error('Second milestone failed'));

        const milestones: ProjectMilestoneCreateInput[] = [
          {
            name: 'Feature Requirements',
            projectId: 'project-1',
            sortOrder: 1,
          },
          {
            name: 'Design Approval',
            projectId: 'project-1',
            sortOrder: 2,
          },
        ];

        // Test that first succeeds and second fails
        const firstResult = await graphqlClient.createProjectMilestone(milestones[0]);
        expect(firstResult).toEqual(mockResponses[0].data);

        await expect(
          graphqlClient.createProjectMilestone(milestones[1])
        ).rejects.toThrow('GraphQL operation failed: Second milestone failed');

        expect(mockRawRequest).toHaveBeenCalledTimes(2);
      });
    });
  });
});
