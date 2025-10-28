/**
 * This file contains the schema definitions for all MCP tools exposed by the Linear server.
 * These schemas define the input parameters and validation rules for each tool.
 */

export const toolSchemas = {
  linear_auth: {
    name: 'linear_auth',
    description: 'Initialize OAuth flow with Linear',
    inputSchema: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
          description: 'Linear OAuth client ID',
        },
        clientSecret: {
          type: 'string',
          description: 'Linear OAuth client secret',
        },
        redirectUri: {
          type: 'string',
          description: 'OAuth redirect URI',
        },
      },
      required: ['clientId', 'clientSecret', 'redirectUri'],
    },
  },

  linear_auth_callback: {
    name: 'linear_auth_callback',
    description: 'Handle OAuth callback',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'OAuth authorization code',
        },
      },
      required: ['code'],
    },
  },

  linear_create_issue: {
    name: 'linear_create_issue',
    description: 'Create a new issue in Linear',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Issue title',
        },
        description: {
          type: 'string',
          description: 'Issue description',
        },
        teamId: {
          type: 'string',
          description: 'Team ID',
        },
        assigneeId: {
          type: 'string',
          description: 'Assignee user ID',
          optional: true,
        },
        priority: {
          type: 'number',
          description: 'Issue priority (0-4)',
          optional: true,
        },
        estimate: {
          type: 'number',
          description: 'Issue estimate points (typically 1, 2, 3, 5, 8, etc.)',
          optional: true,
        },
        projectId: {
          type: 'string',
          description: 'Project ID',
          optional: true,
        },
        createAsUser: {
          type: 'string',
          description: 'Name to display for the created issue',
          optional: true,
        },
        displayIconUrl: {
          type: 'string',
          description: 'URL of the avatar to display',
          optional: true,
        },
      },
      required: ['title', 'description', 'teamId'],
    },
  },

  linear_create_project_with_issues: {
    name: 'linear_create_project_with_issues',
    description: 'Create a new project with associated issues. Note: Project requires teamIds (array) not teamId (single value).',
    inputSchema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Project name',
            },
            description: {
              type: 'string',
              description: 'Project description (optional)',
            },
            teamIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of team IDs this project belongs to (Required). Use linear_get_teams to get available team IDs.',
              minItems: 1
            },
          },
          required: ['name', 'teamIds'],
        },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Issue title',
              },
              description: {
                type: 'string',
                description: 'Issue description',
              },
              teamId: {
                type: 'string',
                description: 'Team ID (must match one of the project teamIds)',
              },
            },
            required: ['title', 'description', 'teamId'],
          },
          description: 'List of issues to create with this project',
        },
      },
      required: ['project', 'issues'],
    },
    examples: [
      {
        description: "Create a project with a single team and issue",
        value: {
          project: {
            name: "Q1 Planning",
            description: "Q1 2025 Planning Project",
            teamIds: ["team-id-1"]
          },
          issues: [
            {
              title: "Project Setup",
              description: "Initial project setup tasks",
              teamId: "team-id-1"
            }
          ]
        }
      },
      {
        description: "Create a project with multiple teams",
        value: {
          project: {
            name: "Cross-team Initiative",
            description: "Project spanning multiple teams",
            teamIds: ["team-id-1", "team-id-2"]
          },
          issues: [
            {
              title: "Team 1 Tasks",
              description: "Tasks for team 1",
              teamId: "team-id-1"
            },
            {
              title: "Team 2 Tasks",
              description: "Tasks for team 2",
              teamId: "team-id-2"
            }
          ]
        }
      }
    ]
  },

  linear_update_issue: {
    name: 'linear_update_issue',
    description: 'Update a single issue',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'Issue ID (UUID) to update',
        },
        update: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'New issue title',
              optional: true,
            },
            description: {
              type: 'string',
              description: 'New issue description',
              optional: true,
            },
            stateId: {
              type: 'string',
              description: 'New state ID',
              optional: true,
            },
            assigneeId: {
              type: 'string',
              description: 'New assignee ID',
              optional: true,
            },
            priority: {
              type: 'number',
              description: 'New priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)',
              optional: true,
            },
            projectId: {
              type: 'string',
              description: 'Associate issue with a project',
              optional: true,
            },
          },
        },
      },
      required: ['issueId', 'update'],
    },
  },

  linear_bulk_update_issues: {
    name: 'linear_bulk_update_issues',
    description: 'Update multiple issues at once',
    inputSchema: {
      type: 'object',
      properties: {
        issueIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of issue IDs to update',
        },
        update: {
          type: 'object',
          properties: {
            stateId: {
              type: 'string',
              description: 'New state ID',
              optional: true,
            },
            assigneeId: {
              type: 'string',
              description: 'New assignee ID',
              optional: true,
            },
            priority: {
              type: 'number',
              description: 'New priority (0-4)',
              optional: true,
            },
            estimate: {
              type: 'number',
              description: 'Issue estimate points (typically 1, 2, 3, 5, 8, etc.)',
              optional: true,
            },
          },
        },
      },
      required: ['issueIds', 'update'],
    },
  },

  linear_search_issues: {
    name: 'linear_search_issues',
    description: 'Search for issues with filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query string',
          optional: true,
        },
        teamIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Filter by team IDs',
          optional: true,
        },
        assigneeIds: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Filter by assignee IDs',
          optional: true,
        },
        states: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Filter by state names',
          optional: true,
        },
        priority: {
          type: 'number',
          description: 'Filter by priority (0-4)',
          optional: true,
        },
        first: {
          type: 'number',
          description: 'Number of issues to return (default: 50)',
          optional: true,
        },
        after: {
          type: 'string',
          description: 'Cursor for pagination',
          optional: true,
        },
        orderBy: {
          type: 'string',
          description: 'Field to order by (default: updatedAt)',
          optional: true,
        },
      },
    },
  },

  linear_get_teams: {
    name: 'linear_get_teams',
    description: 'Get all teams with their states and labels',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  linear_get_user: {
    name: 'linear_get_user',
    description: 'Get current user information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  linear_delete_issue: {
    name: 'linear_delete_issue',
    description: 'Delete an issue',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Issue identifier (e.g., ENG-123)',
        },
      },
      required: ['id'],
    },
  },

  linear_delete_issues: {
    name: 'linear_delete_issues',
    description: 'Delete multiple issues',
    inputSchema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of issue identifiers to delete',
        },
      },
      required: ['ids'],
    },
  },

  linear_link_issues: {
    name: 'linear_link_issues',
    description: 'Create a relationship between two issues',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'The source issue ID (UUID)',
        },
        relatedIssueId: {
          type: 'string',
          description: 'The target issue ID (UUID) to link to',
        },
        type: {
          type: 'string',
          description: 'Relationship type: "blocks" (this issue blocks another), "related" (this issue is related to another), "duplicate" (this issue is a duplicate of another)',
        },
      },
      required: ['issueId', 'relatedIssueId', 'type'],
    },
  },

  linear_unlink_issues: {
    name: 'linear_unlink_issues',
    description: 'Remove a relationship between two issues',
    inputSchema: {
      type: 'object',
      properties: {
        relationId: {
          type: 'string',
          description: 'The relationship ID to delete',
        },
      },
      required: ['relationId'],
    },
  },

  linear_get_project: {
    name: 'linear_get_project',
    description: 'Get project information',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Project identifier',
        },
      },
      required: ['id'],
    },
  },

  linear_search_projects: {
    name: 'linear_search_projects',
    description: 'Search for projects by name',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Project name to search for (exact match)',
        },
      },
      required: ['name'],
    },
  },

  linear_create_issues: {
    name: 'linear_create_issues',
    description: 'Create multiple issues at once',
    inputSchema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Issue title',
              },
              description: {
                type: 'string',
                description: 'Issue description',
              },
              teamId: {
                type: 'string',
                description: 'Team ID',
              },
              assigneeId: {
                type: 'string',
                description: 'Assignee user ID',
                optional: true,
              },
              priority: {
                type: 'number',
                description: 'Issue priority (0-4)',
                optional: true,
              },
              projectId: {
                type: 'string',
                description: 'Project ID',
                optional: true,
              },
              estimate: {
                type: 'number',
                description: 'Issue estimate points (typically 1, 2, 3, 5, 8, etc.)',
                optional: true,
              },
              labelIds: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Label IDs to apply',
                optional: true,
              }
            },
            required: ['title', 'description', 'teamId'],
          },
          description: 'List of issues to create',
        },
      },
      required: ['issues'],
    },
  },

  linear_get_issue_comments: {
    name: 'linear_get_issue_comments',
    description: 'Get comments for a specific issue, including threaded replies',
    inputSchema: {
      type: 'object',
      properties: {
        issueId: {
          type: 'string',
          description: 'Issue ID to get comments for',
        },
        first: {
          type: 'number',
          description: 'Number of comments to return (default: 50)',
          optional: true,
        },
        after: {
          type: 'string',
          description: 'Cursor for pagination',
          optional: true,
        },
        includeArchived: {
          type: 'boolean',
          description: 'Include archived comments (default: false)',
          optional: true,
        },
      },
      required: ['issueId'],
    },
  },

  linear_create_comment: {
    name: 'linear_create_comment',
    description: 'Create a new comment on an issue or reply to an existing comment',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'string',
          description: 'Comment content in markdown format',
        },
        issueId: {
          type: 'string',
          description: 'Issue ID to comment on',
        },
        parentCommentId: {
          type: 'string',
          description: 'Parent comment ID for threaded replies (optional)',
          optional: true,
        },
        createAsUser: {
          type: 'string',
          description: 'Name to display for the comment creator (OAuth apps only)',
          optional: true,
        },
        displayIconUrl: {
          type: 'string',
          description: 'URL of the avatar to display (OAuth apps only)',
          optional: true,
        },
      },
      required: ['body', 'issueId'],
    },
  },

  linear_create_project_milestone: {
    name: 'linear_create_project_milestone',
    description: 'Create a new project milestone in Linear',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the project milestone',
        },
        projectId: {
          type: 'string',
          description: 'The ID of the project this milestone belongs to',
        },
        description: {
          type: 'string',
          description: 'The description of the project milestone in markdown format',
          optional: true,
        },
        targetDate: {
          type: 'string',
          description: 'The planned target date of the project milestone (ISO 8601 format)',
          optional: true,
        },
        sortOrder: {
          type: 'number',
          description: 'The sort order for the project milestone within a project',
          optional: true,
        },
      },
      required: ['name', 'projectId'],
    },
  },

  linear_update_project_milestone: {
    name: 'linear_update_project_milestone',
    description: 'Update an existing project milestone',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the project milestone to update',
        },
        name: {
          type: 'string',
          description: 'The name of the project milestone',
          optional: true,
        },
        description: {
          type: 'string',
          description: 'The description of the project milestone in markdown format',
          optional: true,
        },
        targetDate: {
          type: 'string',
          description: 'The planned target date of the project milestone (ISO 8601 format)',
          optional: true,
        },
        projectId: {
          type: 'string',
          description: 'The ID of the project this milestone belongs to',
          optional: true,
        },
        sortOrder: {
          type: 'number',
          description: 'The sort order for the project milestone within a project',
          optional: true,
        },
      },
      required: ['id'],
    },
  },

  linear_delete_project_milestone: {
    name: 'linear_delete_project_milestone',
    description: 'Delete a project milestone',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the project milestone to delete',
        },
      },
      required: ['id'],
    },
  },

  linear_get_project_milestone: {
    name: 'linear_get_project_milestone',
    description: 'Get information about a specific project milestone',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The ID of the project milestone to retrieve',
        },
      },
      required: ['id'],
    },
  },

  linear_search_project_milestones: {
    name: 'linear_search_project_milestones',
    description: 'Search for project milestones with filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Filter by milestone name (exact match)',
          optional: true,
        },
        projectId: {
          type: 'string',
          description: 'Filter by project ID',
          optional: true,
        },
        targetDate: {
          type: 'string',
          description: 'Filter by target date (ISO 8601 format)',
          optional: true,
        },
        first: {
          type: 'number',
          description: 'Number of milestones to return (default: 50)',
          optional: true,
        },
        after: {
          type: 'string',
          description: 'Cursor for pagination',
          optional: true,
        },
        orderBy: {
          type: 'string',
          description: 'Field to order by (default: updatedAt)',
          optional: true,
        },
      },
    },
  },

  linear_get_project_milestones: {
    name: 'linear_get_project_milestones',
    description: 'Get all milestones for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to get milestones for',
        },
        first: {
          type: 'number',
          description: 'Number of milestones to return (default: 50)',
          optional: true,
        },
        after: {
          type: 'string',
          description: 'Cursor for pagination',
          optional: true,
        },
        orderBy: {
          type: 'string',
          description: 'Field to order by (default: sortOrder)',
          optional: true,
        },
      },
      required: ['projectId'],
    },
  },

  linear_create_project_milestones: {
    name: 'linear_create_project_milestones',
    description: 'Create multiple project milestones at once',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: {
          type: 'string',
          description: 'The ID of the project to create milestones for',
        },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'The name of the project milestone',
              },
              description: {
                type: 'string',
                description: 'The description of the project milestone in markdown format',
                optional: true,
              },
              targetDate: {
                type: 'string',
                description: 'The planned target date of the project milestone (ISO 8601 format)',
                optional: true,
              },
              sortOrder: {
                type: 'number',
                description: 'The sort order for the project milestone within a project',
                optional: true,
              },
            },
            required: ['name'],
          },
          description: 'Array of milestones to create',
        },
      },
      required: ['projectId', 'milestones'],
    },
  },
};
