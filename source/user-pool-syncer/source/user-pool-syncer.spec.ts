// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock')
const sinon = require('sinon')
const axios = require('axios')
const MockAdapter = require('axios-mock-adapter')

import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { UserPoolSyncer } from './user-pool-syncer'
import { CognitoIdentityServiceProvider } from 'aws-sdk'

const csv = "name,given_name,family_name,middle_name,nickname,preferred_username,profile,picture,website,email,email_verified,gender,birthdate,zoneinfo,locale,phone_number,phone_number_verified,address,updated_at,custom:id,cognito:mfa_enabled,cognito:username\n,,,,,,,,,name@email.com,true,,,,,+11111111111,false,,,12345678-abcd-abcd-abcd-12345678abcd,false,name"

const dynamoDbQueryResponse: DocumentClient.QueryOutput = {
  "Items":[
    {
      "userName":"name",
      "attributes":
        {
          "phone_number_verified":"false",
          "sub":"12345678-abcd-abcd-abcd-12345678abcd",
          "phone_number":"+19377600022",
          "cognito:user_status":"CONFIRMED",
          "email_verified":"true",
          "email":"name@email.com"
        },
      "importState": "NotImported",
      "userId":"12345678-abcd-abcd-abcd-12345678abcd"
    }
  ],
  "Count":1,
  "ScannedCount":1
}

const getCSVHeaderResponse = {
  "UserPoolId":"us-east-1_userpool1",
  "CSVHeader":["name","given_name","family_name","middle_name","nickname","preferred_username","profile","picture","website","email","email_verified","gender","birthdate","zoneinfo","locale","phone_number","phone_number_verified","address","updated_at","custom:id","cognito:mfa_enabled","cognito:username"]
}

const createUserImportJobResponse = {
  UserImportJob: {
    JobId: '1234'
  }
}

const describeUserImportJobResponse = {
  UserImportJob: {
    Status: 'Succeeded'
  }
}

const userPoolId = 'us-east-1_userpool1'
const mfaEnabled = 'false'
const tableName = 'tableName'
const cloudWatchLogsRoleArn = 'cloudWatchLogsRoleArn'

describe('DynamoDBUserPoolDataStore', () => {

  let axiosMock
  let dynamoDbQuerySpy
  let dynamoDbUpdateSpy
  let cogntioGetCsvHeaderSpy
  let cognitoCreateUserImportJob
  let cognitoStartUserImportJob

  beforeEach(() => {
		axiosMock = new MockAdapter(axios);
		axiosMock.onPut().reply(200, {});

    dynamoDbQuerySpy = sinon.spy((_, callback) => callback(null, dynamoDbQueryResponse))
    awsMock.mock('DynamoDB.DocumentClient', 'query', dynamoDbQuerySpy)

    dynamoDbUpdateSpy = sinon.spy((_, callback) => callback(null, {}))
    awsMock.mock('DynamoDB.DocumentClient', 'update', dynamoDbUpdateSpy)

    cogntioGetCsvHeaderSpy = sinon.spy((_, callback) => callback(null, getCSVHeaderResponse))
    awsMock.mock('CognitoIdentityServiceProvider', 'getCSVHeader', cogntioGetCsvHeaderSpy)

    cognitoCreateUserImportJob = sinon.spy((_, callback) => callback(null, createUserImportJobResponse))
    awsMock.mock('CognitoIdentityServiceProvider', 'createUserImportJob', cognitoCreateUserImportJob)

    cognitoStartUserImportJob = sinon.spy((_, callback) => callback(null, {}))
    awsMock.mock('CognitoIdentityServiceProvider', 'startUserImportJob', cognitoStartUserImportJob)
  })

  afterEach(() => {
    awsMock.restore()
    sinon.restore()
  })

  test('successfully imports users to cognito user pool', async () => {

    const describeUserImportJobSucceededResponse = {
      UserImportJob: {
        Status: 'Succeeded'
      }
    }

    const cognitoDescribeUserImportJobFailed = sinon.spy((_, callback) => callback(null, describeUserImportJobSucceededResponse))
    awsMock.mock('CognitoIdentityServiceProvider', 'describeUserImportJob', cognitoDescribeUserImportJobFailed)

    const dynamoDb = new DocumentClient()
    const cognito = new CognitoIdentityServiceProvider()

    const syncer = new UserPoolSyncer(userPoolId, mfaEnabled, tableName, cloudWatchLogsRoleArn, dynamoDb, cognito)
    await syncer.sync()
  })

  test('handles import failures', async () => {

    const describeUserImportJobFailedResponse = {
      UserImportJob: {
        Status: 'Failed'
      }
    }

    const cognitoDescribeUserImportJobFailed = sinon.spy((_, callback) => callback(null, describeUserImportJobFailedResponse))
    awsMock.mock('CognitoIdentityServiceProvider', 'describeUserImportJob', cognitoDescribeUserImportJobFailed)

    const dynamoDb = new DocumentClient()
    const cognito = new CognitoIdentityServiceProvider()

    const syncer = new UserPoolSyncer(userPoolId, mfaEnabled, tableName, cloudWatchLogsRoleArn, dynamoDb, cognito)
    await syncer.sync()
  })

  test('handles errors', async () => {

    const cognitoDescribeUserImportJobFailed = sinon.spy((_, callback) => callback({}, null))
    awsMock.mock('CognitoIdentityServiceProvider', 'describeUserImportJob', cognitoDescribeUserImportJobFailed)

    const dynamoDb = new DocumentClient()
    const cognito = new CognitoIdentityServiceProvider()

    const syncer = new UserPoolSyncer(userPoolId, mfaEnabled, tableName, cloudWatchLogsRoleArn, dynamoDb, cognito)
    await syncer.sync()
  })
})