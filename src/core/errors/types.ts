import { LinearError, LinearErrorCode, ErrorContext } from './linear-error.js';

/**
 * Authentication-related errors
 */
export class AuthenticationError extends LinearError {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super(
      message,
      context?.code as LinearErrorCode || LinearErrorCode.AUTH_INVALID_CREDENTIALS,
      context,
      cause
    );
    this.name = 'AuthenticationError';
  }
}

/**
 * Validation errors for invalid input parameters
 */
export class ValidationError extends LinearError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly validValues?: unknown[];

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    validValues?: unknown[],
    cause?: Error
  ) {
    const context: ErrorContext = { field, value, validValues };
    super(message, LinearErrorCode.VALIDATION_INVALID_VALUE, context, cause);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
    this.validValues = validValues;
  }
}

/**
 * Resource not found errors (issues, projects, etc.)
 */
export class ResourceNotFoundError extends LinearError {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string, cause?: Error) {
    super(
      `${resourceType} not found: ${resourceId}`,
      LinearErrorCode.RESOURCE_NOT_FOUND,
      { resourceType, resourceId },
      cause
    );
    this.name = 'ResourceNotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends LinearError {
  public readonly retryAfter?: number;
  public readonly remaining?: number;
  public readonly resetTime?: number;

  constructor(
    message: string,
    retryAfter?: number,
    remaining?: number,
    resetTime?: number,
    cause?: Error
  ) {
    super(
      message,
      LinearErrorCode.RATE_LIMIT_EXCEEDED,
      { retryAfter, remaining, resetTime },
      cause
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.remaining = remaining;
    this.resetTime = resetTime;
  }
}

/**
 * Network-related errors (timeouts, connection failures)
 */
export class NetworkError extends LinearError {
  public readonly url?: string;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: LinearErrorCode = LinearErrorCode.NETWORK_CONNECTION_FAILED,
    url?: string,
    statusCode?: number,
    cause?: Error
  ) {
    super(message, code, { url, statusCode }, cause);
    this.name = 'NetworkError';
    this.url = url;
    this.statusCode = statusCode;
  }
}

/**
 * GraphQL operation errors
 */
export class GraphQLError extends LinearError {
  public readonly query?: string;
  public readonly variables?: Record<string, unknown>;
  public readonly graphQLErrors?: unknown[];

  constructor(
    message: string,
    query?: string,
    variables?: Record<string, unknown>,
    graphQLErrors?: unknown[],
    cause?: Error
  ) {
    super(
      message,
      LinearErrorCode.GRAPHQL_QUERY_FAILED,
      { query: query?.substring(0, 200), variables, graphQLErrors },
      cause
    );
    this.name = 'GraphQLError';
    this.query = query;
    this.variables = variables;
    this.graphQLErrors = graphQLErrors;
  }
}

/**
 * Specific error for when an issue is not found
 */
export class IssueNotFoundError extends ResourceNotFoundError {
  constructor(issueId: string, cause?: Error) {
    super('Issue', issueId, cause);
    this.name = 'IssueNotFoundError';
  }
}

/**
 * Specific error for when a project is not found
 */
export class ProjectNotFoundError extends ResourceNotFoundError {
  constructor(projectId: string, cause?: Error) {
    super('Project', projectId, cause);
    this.name = 'ProjectNotFoundError';
  }
}

/**
 * Specific error for when a team is not found
 */
export class TeamNotFoundError extends ResourceNotFoundError {
  constructor(teamId: string, cause?: Error) {
    super('Team', teamId, cause);
    this.name = 'TeamNotFoundError';
  }
}

/**
 * Specific error for when a milestone is not found
 */
export class MilestoneNotFoundError extends ResourceNotFoundError {
  constructor(milestoneId: string, cause?: Error) {
    super('Milestone', milestoneId, cause);
    this.name = 'MilestoneNotFoundError';
  }
}
