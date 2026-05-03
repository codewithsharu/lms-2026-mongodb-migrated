/**
 * Performance API Service
 * Handles all performance monitoring API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const performanceApi = {
  // Dashboard endpoints
  getDashboardData: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/dashboard`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  getSystemHealth: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  getHistoricalData: async (timeRange = '1h') => {
    const response = await fetch(`${API_BASE_URL}/performance/historical?timeRange=${timeRange}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // System metrics endpoints
  getSystemMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/system`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  getDatabasePerformance: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/database`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  getApplicationMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/application`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // Alerts endpoints
  getAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/alerts`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  getCriticalAlerts: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/alerts/critical`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // Thresholds endpoints
  getThresholds: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/thresholds`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  updateThresholds: async (thresholds) => {
    const response = await fetch(`${API_BASE_URL}/performance/thresholds`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(thresholds)
    });
    return response.json();
  },

  // Recommendations endpoint
  getRecommendations: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/recommendations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // Monitoring status endpoint
  getMonitoringStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // Refresh endpoint
  refreshMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    return response.json();
  },

  // Summary endpoint
  getPerformanceSummary: async () => {
    const response = await fetch(`${API_BASE_URL}/performance/summary`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return response.json();
  }
};

// Helper function to get auth token
const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

// Error handling wrapper
const withErrorHandling = async (apiCall, errorMessage = 'Performance API call failed') => {
  try {
    const response = await apiCall();
    
    if (!response.success) {
      throw new Error(response.error || errorMessage);
    }
    
    return response;
  } catch (error) {
    console.error('Performance API Error:', error);
    throw error;
  }
};

// Enhanced API methods with error handling
const enhancedPerformanceApi = {
  ...performanceApi,
  
  // Wrapped methods with error handling
  getDashboardData: async () => {
    return withErrorHandling(() => performanceApi.getDashboardData(), 'Failed to load dashboard data');
  },
  
  getSystemHealth: async () => {
    return withErrorHandling(() => performanceApi.getSystemHealth(), 'Failed to get system health');
  },
  
  getHistoricalData: async (timeRange) => {
    return withErrorHandling(() => performanceApi.getHistoricalData(timeRange), 'Failed to get historical data');
  },
  
  getSystemMetrics: async () => {
    return withErrorHandling(() => performanceApi.getSystemMetrics(), 'Failed to get system metrics');
  },
  
  getDatabasePerformance: async () => {
    return withErrorHandling(() => performanceApi.getDatabasePerformance(), 'Failed to get database performance');
  },
  
  getApplicationMetrics: async () => {
    return withErrorHandling(() => performanceApi.getApplicationMetrics(), 'Failed to get application metrics');
  },
  
  getAlerts: async () => {
    return withErrorHandling(() => performanceApi.getAlerts(), 'Failed to get alerts');
  },
  
  getCriticalAlerts: async () => {
    return withErrorHandling(() => performanceApi.getCriticalAlerts(), 'Failed to get critical alerts');
  },
  
  updateThresholds: async (thresholds) => {
    return withErrorHandling(() => performanceApi.updateThresholds(thresholds), 'Failed to update thresholds');
  },
  
  getRecommendations: async () => {
    return withErrorHandling(() => performanceApi.getRecommendations(), 'Failed to get recommendations');
  },
  
  getMonitoringStatus: async () => {
    return withErrorHandling(() => performanceApi.getMonitoringStatus(), 'Failed to get monitoring status');
  },
  
  refreshMetrics: async () => {
    return withErrorHandling(() => performanceApi.refreshMetrics(), 'Failed to refresh metrics');
  },
  
  getPerformanceSummary: async () => {
    return withErrorHandling(() => performanceApi.getPerformanceSummary(), 'Failed to get performance summary');
  }
};

export default enhancedPerformanceApi;
