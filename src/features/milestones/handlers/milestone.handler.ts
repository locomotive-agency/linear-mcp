import { BaseHandler } from '../../../core/handlers/base.handler.js';
import { BaseToolResponse } from '../../../core/interfaces/tool-handler.interface.js';
import { LinearAuth } from '../../../auth.js';
import { LinearGraphQLClient } from '../../../graphql/client.js';
import { ProjectMilestone } from '../types/milestone.types.js';

/**
 * Handler for project milestone-related operations.
 * Manages creating, updating, deleting, and retrieving project milestone information.
 */
export class MilestoneHandler extends BaseHandler {
  constructor(auth: LinearAuth, graphqlClient?: LinearGraphQLClient) {
    super(auth, graphqlClient);
  }

  /**
   * Creates a new project milestone.
   */
  async handleCreateProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['name', 'projectId']);

      const result = await client.createProjectMilestone({
        name: args.name,
        description: args.description,
        targetDate: args.targetDate,
        projectId: args.projectId,
        sortOrder: args.sortOrder,
        id: args.id,
      });

      if (!result.projectMilestoneCreate.success) {
        throw new Error('Failed to create project milestone');
      }

      const { projectMilestone } = result.projectMilestoneCreate;

      const response = [
        `Successfully created project milestone`,
        `Name: ${projectMilestone.name}`,
        `Project: ${projectMilestone.project.name}`,
        `Status: ${projectMilestone.status}`,
      ];

      if (projectMilestone.description) {
        response.push(`Description: ${projectMilestone.description}`);
      }

      if (projectMilestone.targetDate) {
        response.push(`Target Date: ${projectMilestone.targetDate}`);
      }

      response.push(`Progress: ${projectMilestone.progress}%`);

      return this.createResponse(response.join('\n'));
    } catch (error) {
      this.handleError(error, 'create project milestone');
    }
  }

  /**
   * Updates an existing project milestone.
   */
  async handleUpdateProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['id']);

      const updateInput: any = {};
      if (args.name !== undefined) updateInput.name = args.name;
      if (args.description !== undefined) updateInput.description = args.description;
      if (args.targetDate !== undefined) updateInput.targetDate = args.targetDate;
      if (args.projectId !== undefined) updateInput.projectId = args.projectId;
      if (args.sortOrder !== undefined) updateInput.sortOrder = args.sortOrder;

      const result = await client.updateProjectMilestone(args.id, updateInput);

      if (!result.projectMilestoneUpdate.success) {
        throw new Error('Failed to update project milestone');
      }

      const { projectMilestone } = result.projectMilestoneUpdate;

      const response = [
        `Successfully updated project milestone`,
        `Name: ${projectMilestone.name}`,
        `Project: ${projectMilestone.project.name}`,
        `Status: ${projectMilestone.status}`,
        `Progress: ${projectMilestone.progress}%`,
      ];

      if (projectMilestone.description) {
        response.push(`Description: ${projectMilestone.description}`);
      }

      if (projectMilestone.targetDate) {
        response.push(`Target Date: ${projectMilestone.targetDate}`);
      }

      return this.createResponse(response.join('\n'));
    } catch (error) {
      this.handleError(error, 'update project milestone');
    }
  }

  /**
   * Deletes a project milestone.
   */
  async handleDeleteProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['id']);

      const result = await client.deleteProjectMilestone(args.id);

      if (!result.projectMilestoneDelete.success) {
        throw new Error('Failed to delete project milestone');
      }

      return this.createResponse(`Successfully deleted project milestone with ID: ${args.id}`);
    } catch (error) {
      this.handleError(error, 'delete project milestone');
    }
  }

  /**
   * Gets information about a specific project milestone.
   */
  async handleGetProjectMilestone(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['id']);

      const result = await client.getProjectMilestone(args.id);

      const processedResult = {
        ...result,
        projectMilestone: {
          ...result.projectMilestone,
          actualDescription: this.getProjectMilestoneDescription(result.projectMilestone)
        }
      };

      return this.createJsonResponse(processedResult);
    } catch (error) {
      this.handleError(error, 'get project milestone info');
    }
  }

  /**
   * Searches for project milestones with filtering and pagination.
   */
  async handleSearchProjectMilestones(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();

      const filter: any = {};
      
      if (args.name) {
        filter.name = { eq: args.name };
      }
      
      if (args.projectId) {
        filter.project = { id: { eq: args.projectId } };
      }

      if (args.targetDate) {
        filter.targetDate = { eq: args.targetDate };
      }

      const result = await client.searchProjectMilestones({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        first: args.first || 50,
        after: args.after,
        orderBy: args.orderBy || 'updatedAt'
      });

      const processedResult = {
        ...result,
        projectMilestones: {
          ...result.projectMilestones,
          nodes: result.projectMilestones.nodes.map(milestone => ({
            ...milestone,
            actualDescription: this.getProjectMilestoneDescription(milestone)
          }))
        }
      };

      return this.createJsonResponse(processedResult);
    } catch (error) {
      this.handleError(error, 'search project milestones');
    }
  }

  /**
   * Gets project milestones for a specific project.
   */
  async handleGetProjectMilestones(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['projectId']);

      const result = await client.searchProjectMilestones({
        filter: {
          project: { id: { eq: args.projectId } }
        },
        first: args.first || 50,
        after: args.after,
        orderBy: args.orderBy || 'sortOrder'
      });

      const processedResult = {
        ...result,
        projectMilestones: {
          ...result.projectMilestones,
          nodes: result.projectMilestones.nodes.map(milestone => ({
            ...milestone,
            actualDescription: this.getProjectMilestoneDescription(milestone)
          }))
        }
      };

      return this.createJsonResponse(processedResult);
    } catch (error) {
      this.handleError(error, 'get project milestones');
    }
  }

  /**
   * Creates multiple project milestones at once.
   */
  async handleCreateProjectMilestones(args: any): Promise<BaseToolResponse> {
    try {
      const client = this.verifyAuth();
      this.validateRequiredParams(args, ['projectId', 'milestones']);

      if (!Array.isArray(args.milestones) || args.milestones.length === 0) {
        throw new Error('milestones must be a non-empty array');
      }

      const results = [];
      const errors = [];

      for (let i = 0; i < args.milestones.length; i++) {
        const milestone = args.milestones[i];
        
        if (!milestone.name) {
          errors.push(`Milestone ${i + 1}: name is required`);
          continue;
        }

        try {
          const result = await client.createProjectMilestone({
            name: milestone.name,
            description: milestone.description,
            targetDate: milestone.targetDate,
            projectId: args.projectId,
            sortOrder: milestone.sortOrder || (i + 1),
          });

          if (result.projectMilestoneCreate.success) {
            results.push({
              name: milestone.name,
              id: result.projectMilestoneCreate.projectMilestone.id,
              status: 'created'
            });
          } else {
            errors.push(`Failed to create milestone: ${milestone.name}`);
          }
        } catch (error) {
          errors.push(`Error creating milestone "${milestone.name}": ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const response = [
        `Bulk milestone creation completed`,
        `Successfully created: ${results.length} milestones`,
        `Errors: ${errors.length}`,
      ];

      if (results.length > 0) {
        response.push('\nCreated milestones:');
        results.forEach(result => {
          response.push(`- ${result.name} (ID: ${result.id})`);
        });
      }

      if (errors.length > 0) {
        response.push('\nErrors:');
        errors.forEach(error => {
          response.push(`- ${error}`);
        });
      }

      return this.createResponse(response.join('\n'));
    } catch (error) {
      this.handleError(error, 'create project milestones');
    }
  }

  /**
   * Utility function to get the actual project milestone description
   * Prioritizes documentContent.content over legacy description field
   */
  private getProjectMilestoneDescription(milestone: ProjectMilestone): string {
    return milestone.documentContent?.content || milestone.description || '';
  }
}
