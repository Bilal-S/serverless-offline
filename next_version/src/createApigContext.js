'use strict';

const jsonPath = require('./utils/jsonPath');
const jsStringEscape = require('js-string-escape');
const store = require('./state/store');

/*
  Returns a context object that mocks APIG mapping template reference
  http://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html
*/
module.exports = function createApigContext(request, payload) {
  
  const options = store.getState().options;
  const path = x => jsonPath(payload || {}, x);
  const authPrincipalId = request.auth && request.auth.credentials && request.auth.credentials.user;
  
  // Capitalizes request.headers as NodeJS uses lowercase headers 
  // however API Gateway always passes capitalized headers
  const headers = {};
  for (let key in request.headers) {
    headers[key.replace(/((?:^|-)[a-z])/g, x => x.toUpperCase())] = request.headers[key];
  }
  
  return {
    context: {
      apiId: 'offlineContext_apiId',
      authorizer: {
        principalId: authPrincipalId || process.env.PRINCIPAL_ID || 'offlineContext_authorizer_principalId', // See #24
      },
      httpMethod: request.method.toUpperCase(),
      identity: {
        accountId: 'offlineContext_accountId',
        apiKey: 'offlineContext_apiKey',
        caller: 'offlineContext_caller',
        cognitoAuthenticationProvider: 'offlineContext_cognitoAuthenticationProvider',
        cognitoAuthenticationType: 'offlineContext_cognitoAuthenticationType',
        sourceIp: request.info.remoteAddress,
        user: 'offlineContext_user',
        userAgent: request.headers['user-agent'],
        userArn: 'offlineContext_userArn',
      },
      requestId: 'offlineContext_requestId_' + Math.random().toString(10).slice(2),
      resourceId: 'offlineContext_resourceId',
      resourcePath: request.route.path,
      stage: options.stage,
    },
    input: {
      json: x => JSON.stringify(path(x)),
      params: x => typeof x === 'string' ?
        request.params[x] || request.query[x] || headers[x] :
        {
          path: request.params,
          querystring: request.query,
          header: headers,
        },
      path,
    },
    stageVariables: options.stageVariables,
    util: {
      urlEncode: encodeURI,
      urlDecode: decodeURI,
      escapeJavaScript: string => jsStringEscape(string).replace(/\\n/g, '\n'), // See #26,
      base64Encode: x => new Buffer(x.toString(), 'binary').toString('base64'),
      base64Decode: x => new Buffer(x.toString(), 'base64').toString('binary'),
    },
  };
};
