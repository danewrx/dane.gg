/**
 * Utility functions for handling and formatting errors
 */

/**
 * Extract a user-friendly error message from various error formats
 */
export function getErrorMessage(error: any, fallback: string = 'An error occurred'): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's an Error object, check for structured data first
  if (error instanceof Error) {
    // Check if it has response data with a message
    if ((error as any).response?.data?.message) {
      return (error as any).response.data.message;
    }
    
    // Check if it has a data property with a message
    if ((error as any).data?.message) {
      return (error as any).data.message;
    }
    
    // Use the error message
    if (error.message) {
      return error.message;
    }
  }

  // If it's an object with a message property
  if (error && typeof error === 'object' && error.message) {
    return error.message;
  }

  // If it's an object with an error property
  if (error && typeof error === 'object' && error.error) {
    return error.error;
  }

  // Fallback to the provided fallback message
  return fallback;
}

/**
 * Extract error message from API response error
 */
export function getApiErrorMessage(error: any, fallback: string = 'Request failed'): string {
  // Check for structured API error response
  if (error && typeof error === 'object') {
    // Check for nested response data
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    // Check for direct data property
    if (error.data?.message) {
      return error.data.message;
    }
    
    // Check for direct message property
    if (error.message) {
      return error.message;
    }
    
    // Check for error property
    if (error.error) {
      return error.error;
    }
  }

  return fallback;
}
