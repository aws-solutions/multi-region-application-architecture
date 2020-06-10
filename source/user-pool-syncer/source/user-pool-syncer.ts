// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityServiceProvider } from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { UserImportJobType } from 'aws-sdk/clients/cognitoidentityserviceprovider'

import * as os from 'os'
const axios = require('axios')
const metrics = require('./metrics')

export enum ImportStates {
  NotImported = 'NotImported',
  ImportInProgress = 'ImportInProgress',
  ImportFailed = 'ImportFailed',
  ImportSucceeded = 'ImportSucceeded'
}

export class UserPoolSyncer {

  // Wait the speicified time before re-checking the status of the import job
  private readonly verifyImportWaitTime:number = 1000
  // The maximum number of users to import at a time
  private readonly usersToImport = 100

  private readonly userPoolId: string
  private readonly mfaEnabled: string
  private readonly tableName: string
  private readonly cloudWatchLogsRoleArn: string
  private readonly dynamoDb: DocumentClient
  private readonly cognito: CognitoIdentityServiceProvider

  constructor(userPoolId: string, mfaEnabled: string, tableName: string, cloudWatchLogsRoleArn: string, dynamoDb: DocumentClient, cognito: CognitoIdentityServiceProvider) {
    this.userPoolId = userPoolId
    this.mfaEnabled = mfaEnabled
    this.tableName = tableName
    this.cloudWatchLogsRoleArn = cloudWatchLogsRoleArn
    this.dynamoDb = dynamoDb
    this.cognito = cognito
  }

  async sync(): Promise<void> {
    try {
      // Get the next batch of users to import from the dynamodb user replication table
      const users = await this.getUsersToImport()
      console.log(`UserPoolSyncer found ${users.length} users to import`)
      if (users.length === 0) {
        return
      }
      
      // Build a csv of the users to import
      const csv = await this.createCsv(users)

      // Create the user csv import job against the secondary user pool
      let createUserImportJob = await this.cognito.createUserImportJob({
        JobName: "SecondaryUserPoolImportJob", 
        UserPoolId: this.userPoolId,
        CloudWatchLogsRoleArn: this.cloudWatchLogsRoleArn
      }).promise()
      
      const importJobId = createUserImportJob.UserImportJob.JobId
      console.log(`Created User Import Job with id ${importJobId}`)

      // Upload the csv file to s3 using the presigned url returned from the createUserImportJob call
      const options = { headers: { 'x-amz-server-side-encryption': 'aws:kms' } }
      await axios.put(createUserImportJob.UserImportJob.PreSignedUrl, csv, options)

      // Start the user csv import job against the secondary user pool
      await this.cognito.startUserImportJob({
        UserPoolId: this.userPoolId,
        JobId: importJobId
      }).promise()
      console.log(`Started User Import Job with id ${importJobId}`)

      // Mark all the users as ImportInProgress and add the import job id to each for tracking purposes.
      for (const user of users) {
        await this.dynamoDb.update({
          TableName: this.tableName,
          Key: { 'userId': user.userId },
          UpdateExpression: 'set importState = :importState, importJobId =:importJobId',
          ExpressionAttributeValues:{
            ':importState': ImportStates.ImportInProgress,
            ':importJobId': importJobId
          }
        }).promise()
      }

      // Wait for the import job to finish, should only be a matter of seconds given its a max of 1000 users to import
      const importResult = await this.waitForJobToFinish(importJobId)
      console.log(`Finished User Import Job with id ${importJobId} with status: ${importResult.Status}`)

      await metrics.send({
        EventType: 'UserPoolImport',
        UsersCount: users.length,
        Status: importResult.Status
      })

      // Lastly, update the users replication table with the import status
      if (importResult.Status === 'Succeeded') {
        await this.handleImportJobSucceeded(importJobId, users)
      } else {
        await this.handleImportJobFailed(importJobId, importResult.Status, importResult.CompletionMessage, users)
      }
    }
    catch (error) {
      console.log(`error: ${error}`)
    }
  }

  async getUsersToImport(): Promise<DocumentClient.AttributeMap[]> {
    const params: DocumentClient.QueryInput = {
      TableName: this.tableName,
      IndexName: 'importState',
      Limit: this.usersToImport,
      KeyConditionExpression: 'importState = :importState',
      ExpressionAttributeValues: {
        ':importState': ImportStates.NotImported.toString()
      }
    }

    const userItems = await this.dynamoDb.query(params).promise()
    return userItems.Items
  }

  async createCsv(users: DocumentClient.AttributeMap[]): Promise<string> {
    const getCsvHeaderResponse = await this.cognito.getCSVHeader({ UserPoolId: this.userPoolId }).promise()

    let csv = this.formatHeaders(getCsvHeaderResponse.CSVHeader)
    for (const user of users) {
      const userCsv = this.formatUserToCsv(getCsvHeaderResponse.CSVHeader, user)
      csv += userCsv
    }

    return csv
  }

  async waitForJobToFinish(importJobId: string): Promise<UserImportJobType> {
    // wait for verification that the import job finished
    while (true) {
      await this.waitForTimeout(this.verifyImportWaitTime)

      const describeImport = await this.cognito.describeUserImportJob({
        JobId: importJobId,
        UserPoolId: this.userPoolId
      }).promise()

      const status = describeImport.UserImportJob.Status

      if (status !== 'Pending' && status !== 'InProgress') {
        return describeImport.UserImportJob
      } 
    }
  }

  async handleImportJobSucceeded(importJobId: string, users: DocumentClient.AttributeMap[]): Promise<void> {
    for (const user of users) {
      await this.dynamoDb.update({
        TableName: this.tableName,
        Key: { 'userId': user.userId },
        UpdateExpression: 'set importState = :importState, importJobId =:importJobId',
        ExpressionAttributeValues:{
          ':importState': ImportStates.ImportSucceeded.toString(),
          ':importJobId': importJobId
        }
      }).promise()
    }
  }

  async handleImportJobFailed(importJobId: string, importStatus: string, importMessage: string, users: DocumentClient.AttributeMap[]): Promise<void> {

    for (const user of users) {
      await this.dynamoDb.update({
        TableName: this.tableName,
        Key: { 'userId': user.userId },
        UpdateExpression: 'set importState = :importState, importJobId = :importJobId, importMessage = :importMessage',
        ExpressionAttributeValues:{
          ':importState': ImportStates.ImportFailed.toString(),
          ':importJobId': importJobId,
          ':importMessage': `${importStatus} - ${importMessage}`
        }
      }).promise()
    }
  }

  formatHeaders(headers: string[]): string {
    let headersCsv = ''
    for (let header of headers) {
      headersCsv += `${header},`
    }

    return headersCsv.slice(0, -1) + os.EOL
  }

  formatUserToCsv(attributes: string[], user: DocumentClient.AttributeMap): String {
    let userAsCsv = ''

    // most user pool attributes map 1:1 with the name of the field Cognito is expecting, 
    // but some do not, hence the first few if/else checks
    for (let attr of attributes) {  
      if (attr == "cognito:username") {
        userAsCsv += `${user.userName},`
      } else if (attr == "cognito:mfa_enabled") {
        userAsCsv += `${this.mfaEnabled},` 
      } else if (attr == "custom:id") {
        userAsCsv += `${user.userId},` 
      } else if (user.attributes.hasOwnProperty(attr)) {
        userAsCsv += `${user.attributes[attr]},` 
      } else {
        userAsCsv += ','
      }
    }

    return userAsCsv.slice(0, -1) + os.EOL
  }

  waitForTimeout(timeoutMillis: number): Promise<void> {
    return new Promise(resolve => setTimeout(() => {
      resolve()
    }, timeoutMillis))
  }
}