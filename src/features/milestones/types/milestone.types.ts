/**
 * Project Milestone operation types
 * These types define the structure for project milestone-related operations in Linear
 * Based on Linear's actual GraphQL schema
 */

/**
 * Document content structure for rich text descriptions
 */
export interface DocumentContent {
  /** Markdown/plain text version of the content */
  content?: string;
  /** Document state information for rich text formatting */
  contentState?: string;
}

/**
 * Project milestone status enum
 */
export type ProjectMilestoneStatus = 'done' | 'next' | 'overdue' | 'unstarted';

/**
 * Project milestone information based on Linear's GraphQL schema
 */
export interface ProjectMilestone {
  id: string;
  name: string;
  description?: string;
  descriptionState?: string;
  documentContent?: DocumentContent;
  targetDate?: string;
  status: ProjectMilestoneStatus;
  progress: number;
  sortOrder: number;
  project: {
    id: string;
    name: string;
  };
  issues: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
    nodes: Array<{
      id: string;
      identifier: string;
      title: string;
      url: string;
    }>;
  };
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new project milestone
 */
export interface ProjectMilestoneCreateInput {
  /** The name of the project milestone */
  name: string;

  /** The description of the project milestone in markdown format */
  description?: string;

  /** The planned target date of the project milestone */
  targetDate?: string;

  /** Related project for the project milestone */
  projectId: string;

  /** The sort order for the project milestone within a project */
  sortOrder?: number;

  /** The identifier in UUID v4 format. If none is provided, the backend will generate one */
  id?: string;
}

/**
 * Input for updating an existing project milestone
 */
export interface ProjectMilestoneUpdateInput {
  /** The name of the project milestone */
  name?: string;

  /** The description of the project milestone in markdown format */
  description?: string;

  /** The planned target date of the project milestone */
  targetDate?: string;

  /** Related project for the project milestone */
  projectId?: string;

  /** The sort order for the project milestone within a project */
  sortOrder?: number;
}

export interface ProjectMilestoneResponse {
  projectMilestoneCreate: {
    success: boolean;
    projectMilestone: ProjectMilestone;
    lastSyncId: number;
  };
}

export interface ProjectMilestoneUpdateResponse {
  projectMilestoneUpdate: {
    success: boolean;
    projectMilestone: ProjectMilestone;
    lastSyncId: number;
  };
}

export interface ProjectMilestoneDeleteResponse {
  projectMilestoneDelete: {
    success: boolean;
    lastSyncId: number;
  };
}

export interface SearchProjectMilestonesResponse {
  projectMilestones: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string;
    };
    nodes: ProjectMilestone[];
  };
}

export interface GetProjectMilestoneResponse {
  projectMilestone: ProjectMilestone;
}
