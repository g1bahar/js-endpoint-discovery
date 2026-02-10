/**
 * Endpoint parametrelerini tespit eder
 */

function extractQueryParams(endpoint) {
  const params = [];
  const url = new URL(endpoint, "http://dummy.com");
  
  url.searchParams.forEach((value, key) => {
    params.push({
      name: key,
      type: "query",
      example: value
    });
  });
  
  return params;
}

function extractPathParams(endpoint) {
  const params = [];
  const pathParamRegex = /:(\w+)/g;
  let match;
  
  while ((match = pathParamRegex.exec(endpoint)) !== null) {
    params.push({
      name: match[1],
      type: "path",
      example: null
    });
  }
  
  return params;
}

function extractParams(endpoint) {
  const queryParams = extractQueryParams(endpoint);
  const pathParams = extractPathParams(endpoint);
  
  return {
    query: queryParams,
    path: pathParams,
    total: queryParams.length + pathParams.length
  };
}

module.exports = { extractParams, extractQueryParams, extractPathParams };

