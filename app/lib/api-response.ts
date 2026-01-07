/**
 * Standardized API Response Wrapper
 * Provides consistent response formatting across all API endpoints
 */

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
  timestamp: string;
}

/**
 * Success response builder
 */
export function successResponse<T>(
  data: T,
  message: string = ''
): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    statusCode: 200,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Error response builder
 */
export function errorResponse(
  error: string | Error,
  code: string = 'UNKNOWN_ERROR',
  statusCode: number = 500
): ApiResponse<null> {
  const errorMessage = error instanceof Error ? error.message : error;

  return {
    success: false,
    data: null,
    error: errorMessage,
    message: code,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validation error response builder - handles Zod issues
 */
export function validationErrorResponse(
  errors: any[] | Record<string, string>,
  message: string = 'Request validation failed'
): ApiResponse<{
  errors: any;
}> {
  // Handle Zod ZodIssue[] arrays
  let formattedErrors: Record<string, string> | any[] = errors;
  
  if (Array.isArray(errors)) {
    // Convert Zod issues to readable format
    formattedErrors = errors.map((issue: any) => ({
      path: issue.path?.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
    }));
  }

  return {
    success: false,
    data: { errors: formattedErrors },
    error: 'Validation failed',
    message,
    statusCode: 400,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Not found response builder
 */
export function notFoundResponse(
  resourceType: string,
  id?: string
): ApiResponse<null> {
  const identifier = id ? ` with ID ${id}` : '';
  return errorResponse(`${resourceType} not found${identifier}`, 'NOT_FOUND', 404);
}

/**
 * Unauthorized response builder
 */
export function unauthorizedResponse(
  message: string = 'Authentication required'
): ApiResponse<null> {
  return errorResponse('Unauthorized', message, 401);
}

/**
 * Forbidden response builder
 */
export function forbiddenResponse(
  message: string = 'Access denied'
): ApiResponse<null> {
  return errorResponse('Forbidden', message, 403);}