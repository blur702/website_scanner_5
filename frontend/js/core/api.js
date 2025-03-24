// frontend/js/core/api.js
// API service for communicating with the backend

const api = {
  baseUrl: '/api',

  get: async (url) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url);
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    } finally {
      setTimeout(() => loadingOverlay.hide(), 300); // Small delay to prevent flickering
    }
  },

  post: async (url, data) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error('POST request failed:', error);
      // Show error notification
      if (window.Notification) {
        Notification.show(`Request failed: ${error.message}`, 'error');
      }
      throw error;
    } finally {
      setTimeout(() => loadingOverlay.hide(), 300); // Small delay to prevent flickering
    }
  },

  put: async (url, data) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use default error message
        }
        throw new Error(errorMessage);
      }
      return await response.json();
    } catch (error) {
      console.error('PUT request failed:', error);
      if (window.Notification) {
        Notification.show(`Request failed: ${error.message}`, 'error');
      }
      throw error;
    } finally {
      setTimeout(() => loadingOverlay.hide(), 300); // Small delay to prevent flickering
    }
  },

  delete: async (url) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url, {  // Use the baseUrl
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('DELETE request failed:', error);
      throw error;
    } finally {
      loadingOverlay.hide();
    }
  },
};

window.api = api;