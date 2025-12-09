/**
 * CommonJS wrapper for lib folder
 */

const NexRayAPIClient = require('./index');

// Create default instance
const defaultClient = new NexRayAPIClient();

// Export API methods
module.exports = {
  // HTTP Methods
  get: defaultClient.get.bind(defaultClient),
  getBuffer: defaultClient.getBuffer.bind(defaultClient),
  post: defaultClient.post.bind(defaultClient),
  postForm: defaultClient.postForm.bind(defaultClient),
  put: defaultClient.put.bind(defaultClient),
  delete: defaultClient.delete.bind(defaultClient),
  patch: defaultClient.patch.bind(defaultClient),
  
  // Configuration
  setAuthToken: defaultClient.setAuthToken.bind(defaultClient),
  setHeader: defaultClient.setHeader.bind(defaultClient),
  removeHeader: defaultClient.removeHeader.bind(defaultClient),
  setBaseURL: defaultClient.setBaseURL.bind(defaultClient),
  setTimeout: defaultClient.setTimeout.bind(defaultClient),
  
  // Info
  getConfig: defaultClient.getConfig.bind(defaultClient),
  getErrorMessage: defaultClient.getErrorMessage.bind(defaultClient),
  
  // Classes
  Client: NexRayAPIClient,
  Engine: require('../engine-requirements')
};

module.exports.default = module.exports;
