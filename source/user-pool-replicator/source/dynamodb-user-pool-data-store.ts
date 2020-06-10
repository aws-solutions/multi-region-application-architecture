// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IUser, IUserPoolDataStore } from './user-pool-data-store'
import { DynamoDB } from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

export class DynamoDBUserPoolDataStore implements IUserPoolDataStore {
  
  private readonly tableName: string
  private readonly dynamoDB: DynamoDB.DocumentClient

  constructor(tableName: string, dynamoDB: DynamoDB.DocumentClient) {
    this.tableName = tableName
    this.dynamoDB = dynamoDB
  }

  async hasUser(userId: string): Promise<boolean> {
    const userItems = await this.dynamoDB.query({
      TableName: this.tableName,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }).promise()

    return userItems.Count === 1
  }

  async createOrUpdateUser(user: IUser): Promise<void> {
    await this.dynamoDB.put({
      TableName: this.tableName,
      Item: user
    }).promise()
  }

  async deleteUser(userId: string): Promise<void> {
    await this.dynamoDB.delete({
      TableName: this.tableName,
      Key: { userId }
    }).promise()
  }
}