// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock')
const sinon = require('sinon')
const expect = require('chai').expect

import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { DynamoDBUserPoolDataStore } from './dynamodb-user-pool-data-store'

describe('DynamoDBUserPoolDataStore', () => {

  afterEach(() => {
    awsMock.restore()
    sinon.restore()
  })

  test('can delete user from table', async () => {
    const deleteCall = sinon.spy((_, callback) => callback(null, {}))
    awsMock.mock('DynamoDB.DocumentClient', 'delete', deleteCall)

    const tableName = 'testTable'
    const dynamoDB = new DocumentClient()
    const userId = '1234'

    const expected: DocumentClient.DeleteItemInput = {
      TableName: tableName,
      Key: { userId }
    }

    const userPoolDataStore = new DynamoDBUserPoolDataStore(tableName, dynamoDB)
    await userPoolDataStore.deleteUser(userId)

    expect(deleteCall.calledWith(expected)).to.be.true
  })
})