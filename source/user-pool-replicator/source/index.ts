// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { IUser, IUserPoolDataStore } from './user-pool-data-store'
import { DynamoDBUserPoolDataStore } from './dynamodb-user-pool-data-store'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const tableName = process.env.USER_POOL_REPLICA_TABLE
const region = process.env.REGION

const userPoolDataStore: IUserPoolDataStore = new DynamoDBUserPoolDataStore(tableName, new DocumentClient({ region }))

/**
 * The replicator Lambda triggers off the Cognito Post Authentication event and not the Post Confirmation event.
 * Currently, Cognito only triggers Post Confirmation on a subset of user creation workflows, where as Post Authentication
 * is triggered regardless. Since we are already storing users that have been created, we can use the Post Authentication
 * trigger while avoiding recreating users.
 * 
 * @param event 
 */
export const handler = async (event: any) => {
  try {

    if (event.request.userAttributes['cognito:user_status'] !== 'CONFIRMED') {
      return event
    }

    const userAlreadyReplicated = await userPoolDataStore.hasUser(event.request.userAttributes.sub)

    if (userAlreadyReplicated) {
      return event
    }

    const newUser: IUser = {
      userName: event.userName,
      userId: event.request.userAttributes.sub,
      importState: 'NotImported',
      attributes: event.request.userAttributes
    }

    await userPoolDataStore.createOrUpdateUser(newUser)
    
  } catch (exception) {
    console.log(exception)
  }

  return event
}