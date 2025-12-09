/**
 * ESM wrapper for NexRay API
 */

import axios from 'axios';
import FormData from 'form-data';
import config from '../config.json' assert { type: 'json' };

class NexRayEngine {
  constructor(customConfig = {}) {
    this.config = {
      ...config,
      ...customConfig,
      defaultHeaders: {
        ...config.defaultHeaders,
        ...customConfig.defaultHeaders
      }
    };
    
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        ...this.config.defaultHeaders,
        'User-Agent': `${this.config.defaultHeaders['User-Agent']} (Node.js ${process.version})`
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });
    
    this._setupInterceptors();
  }

  _setupInterceptors() {
    this.client.interceptors.request.use(requestConfig => {
      requestConfig.metadata = {
        startTime: Date.now(),
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };
      return requestConfig;
    });

    this.client.interceptors.response.use(
      response => response,
      async error => {
        const requestConfig = error.config;
        
        if (!requestConfig || !requestConfig.metadata) {
          return Promise.reject(error);
        }

        const { retryCount = 0, maxRetries } = requestConfig.metadata;
        const statusCode = error.response?.status;
        const shouldRetry = !statusCode || this.config.retryStatusCodes.includes(statusCode);
        
        if (retryCount < maxRetries && shouldRetry) {
          const delay = this.config.retryDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          requestConfig.metadata.retryCount = retryCount + 1;
          return this.client(requestConfig);
        }

        return Promise.reject(error);
      }
    );
  }

  getErrorMessage(status) {
    return this.config.errorMessages[status] || `Error ${status}`;
  }

  async _request(method, endpoint, data = null, params = null, options = {}) {
    try {
      const requestConfig = {
        method,
        url: endpoint.startsWith('/') ? endpoint.slice(1) : endpoint,
        ...options
      };

      if (data) {
        if (data instanceof FormData) {
          requestConfig.data = data;
          requestConfig.headers = {
            ...requestConfig.headers,
            ...data.getHeaders()
          };
        } else {
          requestConfig.data = data;
        }
      }

      if (params) {
        requestConfig.params = params;
      }

      const response = await this.client.request(requestConfig);
      return response.data;
      
    } catch (error) {
      if (error.response) {
        return error.response.data;
      }
      
      return {
        status: false,
        author: this.config.author,
        error: error.code === 'ECONNABORTED' 
          ? 'Request timeout' 
          : 'Network error - Cannot connect to server'
      };
    }
  }

  async get(endpoint, params = {}, options = {}) {
    return this._request('GET', endpoint, null, params, options);
  }

  async getBuffer(endpoint, params = {}, options = {}) {
    try {
      const response = await this.client.get(
        endpoint.startsWith('/') ? endpoint.slice(1) : endpoint,
        {
          params,
          responseType: 'arraybuffer',
          ...options
        }
      );
      return Buffer.from(response.data);
    } catch (error) {
      if (error.response) {
        throw error.response.data;
      }
      throw {
        status: false,
        author: this.config.author,
        error: 'Failed to download buffer'
      };
    }
  }

  async post(endpoint, data = {}, options = {}) {
    return this._request('POST', endpoint, data, null, options);
  }

  async postForm(endpoint, formData = {}, options = {}) {
    const form = new FormData();
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        form.append(key, value);
      }
    });
    
    return this._request('POST', endpoint, form, null, {
      ...options,
      headers: {
        ...options.headers
      }
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this._request('PUT', endpoint, data, null, options);
  }

  async delete(endpoint, params = {}, options = {}) {
    return this._request('DELETE', endpoint, null, params, options);
  }

  async patch(endpoint, data = {}, options = {}) {
    return this._request('PATCH', endpoint, data, null, options);
  }

  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  setHeader(key, value) {
    this.client.defaults.headers.common[key] = value;
  }

  removeHeader(key) {
    delete this.client.defaults.headers.common[key];
  }

  setBaseURL(baseURL) {
    this.config.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  setTimeout(timeout) {
    this.config.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }

  getConfig() {
    return {
      ...this.config,
      currentHeaders: this.client.defaults.headers.common
    };
  }
}

class NexRayAPIClient {
  constructor(customConfig = {}) {
    this.engine = new NexRayEngine(customConfig);
  }

  async get(endpoint, params = {}, options = {}) {
    return this.engine.get(endpoint, params, options);
  }

  async getBuffer(endpoint, params = {}, options = {}) {
    return this.engine.getBuffer(endpoint, params, options);
  }

  async post(endpoint, data = {}, options = {}) {
    return this.engine.post(endpoint, data, options);
  }

  async postForm(endpoint, formData = {}, options = {}) {
    return this.engine.postForm(endpoint, formData, options);
  }

  async put(endpoint, data = {}, options = {}) {
    return this.engine.put(endpoint, data, options);
  }

  async delete(endpoint, params = {}, options = {}) {
    return this.engine.delete(endpoint, params, options);
  }

  async patch(endpoint, data = {}, options = {}) {
    return this.engine.patch(endpoint, data, options);
  }

  setAuthToken(token) {
    this.engine.setAuthToken(token);
    return this;
  }

  setHeader(key, value) {
    this.engine.setHeader(key, value);
    return this;
  }

  removeHeader(key) {
    this.engine.removeHeader(key);
    return this;
  }

  setBaseURL(baseURL) {
    this.engine.setBaseURL(baseURL);
    return this;
  }

  setTimeout(timeout) {
    this.engine.setTimeout(timeout);
    return this;
  }

  getConfig() {
    return this.engine.getConfig();
  }

  getErrorMessage(status) {
    return this.engine.getErrorMessage(status);
  }
}

// Create default instance
const defaultClient = new NexRayAPIClient();

// Export individual methods
export const get = defaultClient.get.bind(defaultClient);
export const getBuffer = defaultClient.getBuffer.bind(defaultClient);
export const post = defaultClient.post.bind(defaultClient);
export const postForm = defaultClient.postForm.bind(defaultClient);
export const put = defaultClient.put.bind(defaultClient);
export const delete = defaultClient.delete.bind(defaultClient);
export const patch = defaultClient.patch.bind(defaultClient);
export const setAuthToken = defaultClient.setAuthToken.bind(defaultClient);
export const setHeader = defaultClient.setHeader.bind(defaultClient);
export const removeHeader = defaultClient.removeHeader.bind(defaultClient);
export const setBaseURL = defaultClient.setBaseURL.bind(defaultClient);
export const setTimeout = defaultClient.setTimeout.bind(defaultClient);
export const getConfig = defaultClient.getConfig.bind(defaultClient);
export const getErrorMessage = defaultClient.getErrorMessage.bind(defaultClient);

// Export classes
export { NexRayAPIClient as Client, NexRayEngine as Engine };

// Default export
export default {
  get,
  getBuffer,
  post,
  postForm,
  put,
  delete,
  patch,
  setAuthToken,
  setHeader,
  removeHeader,
  setBaseURL,
  setTimeout,
  getConfig,
  getErrorMessage,
  Client: NexRayAPIClient,
  Engine: NexRayEngine
};
