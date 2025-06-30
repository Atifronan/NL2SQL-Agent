import axios from 'axios';

// Base URL for API
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://127.0.0.1:8000/api';

// Configure axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Send query to AI agent
export const sendQuery = async (question) => {
  try {
    const response = await apiClient.post('/execute-query', { question });
    return response.data;
  } catch (error) {
    console.error('Error sending query:', error);
    throw new Error(error.response?.data?.detail || 'Failed to process query');
  }
};

// API service methods
const ApiService = {
  // AI Agent queries
  queryAgent: (question) => {
    return apiClient.post('/query', { question });
  },
  
  // Data fetching
  fetchData: (params) => {
    return apiClient.post('/fetch-data', params);
  },
  
  // SQL execution
  executeSql: (params) => {
    return apiClient.post('/execute-sql', params);
  },
  
  // Table existence check
  checkTable: (tableName) => {
    return apiClient.get(`/check-table/${tableName}`);
  },

  // Execute query with AI and show results
  executeQuery: (question) => {
    return apiClient.post('/execute-query', { question });
  },
};

export default ApiService;
