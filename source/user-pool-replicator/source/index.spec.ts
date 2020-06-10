// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const sampleEvent = { 
  version: '1',
  region: 'us-east-1',
  userPoolId: 'us-east-1_abcdefg6c',
  userName: 'testUserName',
  callerContext: { 
    awsSdkVersion: 'aws-sdk-unknown-unknown',
    clientId: '123abc45678defg9hijklmnop' 
  },
  triggerSource: 'PostConfirmation_ConfirmSignUp',
  request: { 
    userAttributes: { 
      sub: '12345678-abcd-efgh-ijkl-012345678910',
      'cognito:user_status': 'CONFIRMED',
      email_verified: 'true',
      phone_number_verified: 'false',
      phone_number: '+11111111111',
      email: 'testUserName@email.com' 
    } 
  },
  response: {} 
}

const mockDynamo = jest.fn()
jest.mock('aws-sdk/clients/dynamodb', () => {
  return {
    DocumentClient: jest.fn(() => ({
      put: mockDynamo
    }))
  }
})

// Make sure to import the Lambda function after we've set up the jest mocks
const lambda = require('./index')

describe('UserPoolPostConfirmationLambda', () => {
  beforeEach(() => {
    mockDynamo.mockReset()
  })

  test('handler returns event when data is correct', async () => {

    mockDynamo.mockImplementation(() => {
      return {
        promise() {
          return Promise.resolve()
        }
      }
    })

    const result = await lambda.handler(sampleEvent)
    expect(result).toEqual(sampleEvent)
  })

  test('handler returns event data when lambda fails to parse event', async () => {

    mockDynamo.mockImplementation(() => {
      return {
        promise() {
          return Promise.resolve()
        }
      }
    })

    const result = await lambda.handler({})
    expect(result).toEqual({})
  })
})