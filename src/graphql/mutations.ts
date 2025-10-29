import { gql } from 'graphql-tag';

export const CREATE_ISSUE_MUTATION = gql`
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        team {
          id
          name
        }
        project {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_ISSUES_MUTATION = gql`
  mutation CreateIssues($input: [IssueCreateInput!]!) {
    issueCreate(input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        team {
          id
          name
        }
        project {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
        url
      }
      lastSyncId
    }
  }
`;

export const CREATE_BATCH_ISSUES = gql`
  mutation CreateBatchIssues($input: IssueBatchCreateInput!) {
    issueBatchCreate(input: $input) {
      success
      issues {
        id
        identifier
        title
        url
      }
      lastSyncId
    }
  }
`;

export const UPDATE_ISSUE_MUTATION = gql`
  mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        identifier
        title
        url
        state {
          name
        }
      }
    }
  }
`;

// Note: UPDATE_ISSUES_MUTATION removed - Linear API doesn't support bulk updates with ids parameter
// Use UPDATE_ISSUE_MUTATION in a loop for bulk operations

export const DELETE_ISSUE_MUTATION = gql`
  mutation DeleteIssue($id: String!) {
    issueDelete(id: $id) {
      success
    }
  }
`

export const DELETE_ISSUES_MUTATION = gql`
  mutation DeleteIssues($ids: [String!]!) {
    issueDelete(ids: $ids) {
      success
    }
  }
`;

export const CREATE_ISSUE_LABELS = gql`
  mutation CreateIssueLabels($labels: [IssueLabelCreateInput!]!) {
    issueLabelCreate(input: $labels) {
      success
      issueLabels {
        id
        name
        color
      }
    }
  }
`;

export const CREATE_COMMENT_MUTATION = gql`
  mutation CreateComment($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
        body
        user {
          id
          name
          email
        }
        issue {
          id
          title
        }
        parent {
          id
          body
          user {
            id
            name
          }
        }
        createdAt
        updatedAt
      }
      lastSyncId
    }
  }
`;

export const CREATE_PROJECT_MILESTONE_MUTATION = gql`
  mutation CreateProjectMilestone($input: ProjectMilestoneCreateInput!) {
    projectMilestoneCreate(input: $input) {
      success
      projectMilestone {
        id
        name
        description
        documentContent {
          content
          contentState
        }
        targetDate
        status
        progress
        sortOrder
        project {
          id
          name
        }
        createdAt
        updatedAt
      }
      lastSyncId
    }
  }
`;

export const UPDATE_PROJECT_MILESTONE_MUTATION = gql`
  mutation UpdateProjectMilestone($id: String!, $input: ProjectMilestoneUpdateInput!) {
    projectMilestoneUpdate(id: $id, input: $input) {
      success
      projectMilestone {
        id
        name
        description
        documentContent {
          content
          contentState
        }
        targetDate
        status
        progress
        sortOrder
        project {
          id
          name
        }
        updatedAt
      }
      lastSyncId
    }
  }
`;

export const DELETE_PROJECT_MILESTONE_MUTATION = gql`
  mutation DeleteProjectMilestone($id: String!) {
    projectMilestoneDelete(id: $id) {
      success
      lastSyncId
    }
  }
`;

export const CREATE_ISSUE_RELATION_MUTATION = gql`
  mutation CreateIssueRelation($input: IssueRelationCreateInput!) {
    issueRelationCreate(input: $input) {
      success
      issueRelation {
        id
        type
        issue {
          id
          identifier
          title
        }
        relatedIssue {
          id
          identifier
          title
        }
      }
      lastSyncId
    }
  }
`;

export const DELETE_ISSUE_RELATION_MUTATION = gql`
  mutation DeleteIssueRelation($id: String!) {
    issueRelationDelete(id: $id) {
      success
      lastSyncId
    }
  }
`;
