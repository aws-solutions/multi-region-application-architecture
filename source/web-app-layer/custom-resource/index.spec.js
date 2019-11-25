// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const awsMock = require('aws-sdk-mock')
const axios = require('axios');
const expect = require('chai').expect;
const MockAdapter = require('axios-mock-adapter');

const primaryPresentationLayerRequest = {
  RequestType: "Create",
  ResourceProperties: {
      Resource: "PrimaryPresentationLayer",
      Region: 'us-east-1',
      StackName: 'stackName',
      TemplateUrl: 'templatUrl',
      PhotosBucket: 'photosBucket',
      PhotosApi: 'photosApi',
      UserPoolId: 'userPoolId',
      UserPoolClientId: 'userPoolClientId'
  }
}

const defaultContext = {
  logStreamName: 'cloudwatch',
  getRemainingTimeInMillis: function() { return 1 }
}

const index = require('./index')

describe('CustomResource', () => {

  beforeEach(() => {
    let mock = new MockAdapter(axios);
		mock.onPut().reply(200, {});
  })

  afterEach(() => {
    awsMock.restore()
  })

  it('handles PrimaryPresentationLayer request', async () => {
    const createStackCall = (_, callback) => callback(null, {})
    awsMock.mock('CloudFormation', 'createStack', createStackCall)

    await index.handler(primaryPresentationLayerRequest, defaultContext)
  })
})
