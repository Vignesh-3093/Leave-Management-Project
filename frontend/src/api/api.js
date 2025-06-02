const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000'; // Adjust if backend URL or base path changes

// Helper function to get the token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function to handle logout (we'll use the AuthContext logout later)
// For now, a simple localStorage clear and redirect placeholder
const handleLogout = () => {
  // console.log('API helper detected authentication issue, logging out...');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // You would typically dispatch a logout action or use window.location
  window.location.href = '/login'; // Simple redirect for now
};


/**
 * Generic API call function with JWT authentication.
 * @param {string} endpoint - The API endpoint (e.g., '/auth/protected-test').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
 * @param {object} [data=null] - The request body data (for POST, PUT, etc.).
 * @param {boolean} [requiresAuth=true] - Whether the endpoint requires authentication.
 * @returns {Promise<object>} - A promise that resolves with the JSON response data.
 * @throws {Error} - Throws an error if the request fails or returns a non-OK status.
 */
const api = async (endpoint, method, data = null, requiresAuth = true) => {
  const url = `${API_BASE_URL}${endpoint}`; // Construct the full URL

  const headers = {
    'Content-Type': 'application/json',
    // Add other default headers if needed
  };

  // Add Authorization header if the endpoint requires authentication
  if (requiresAuth) {
    const token = getToken();
    if (!token) {
      // If authentication is required but no token is found, throw an error
      // or handle logout immediately
      console.error('Authentication required but no token found.');
      handleLogout(); // Redirect to login
      throw new Error('Authentication required.'); // Stop execution
    }
    headers['Authorization'] = `Bearer ${token}`; // Add the JWT to the header
  }

  // Configure the fetch options
  const options = {
    method,
    headers,
    // Include body only for methods that typically have one
    body: data ? JSON.stringify(data) : null,
  };

  // Remove body for GET and HEAD requests as they should not have one
  if (method === 'GET' || method === 'HEAD') {
      delete options.body;
  }


  try {
    const response = await fetch(url, options);

    if (!response.ok) { // This covers 400, 401, 403, 404, 500 etc.
      const errorData = await response.json().catch(() => ({ message: response.statusText })); // Try to parse error message
      if ((response.status === 401 || response.status === 403) && requiresAuth) {
          console.error(`Authentication error on protected route: ${response.status}`);
          handleLogout(); // This is the correct place to logout due to token invalidation
          // Re-throw so the component also gets the error message
          throw { response: { data: errorData, status: response.status } }; // Throw structured error for frontend
      }

      // For all other non-OK responses (including 401 on login endpoint, 400, 500 etc.)
      console.error(`API Error: ${response.status} - ${errorData.message}`);
      throw { response: { data: errorData, status: response.status } }; // Throw structured error for frontend
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};

  } catch (error) {
    if (error && typeof error === 'object' && 'response' in error) {
      console.error('API call re-throwing structured error:', error);
      throw error;
    } else {
      console.error('Network or unexpected API call error:', error);
      // For network errors or unexpected errors, create a generic error object.
      throw { message: 'Network error or unexpected API issue.', originalError: error };
    }
  }
};

// Export the api helper function
export default api;
