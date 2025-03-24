// frontend/js/core/api.js
// API service for communicating with the backend

const api = {
  baseUrl: '/api',  // Add this line to configure the API base URL

  get: async (url) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url);  // Use the baseUrl
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    } finally {
      loadingOverlay.hide();
    }
  },
  post: async (url, data) => {
    loadingOverlay.show();
    try {
      const response = await fetch(api.baseUrl + url, {  // Use the baseUrl
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('POST request failed:', error);
    throw error;
  } finally {
    loadingOverlay.hide();
  }
},
put: async (url, data) => {
  loadingOverlay.show();
  try {
    const response = await fetch(api.baseUrl + url, {  // Use the baseUrl
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('PUT request failed:', error);
    throw error;
  } finally {
    loadingOverlay.hide();
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