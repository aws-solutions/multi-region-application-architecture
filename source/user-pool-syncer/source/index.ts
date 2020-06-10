// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CognitoIdentityServiceProvider } from 'aws-sdk'
import { UserPoolSyncer } from './user-pool-syncer'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'

const tableName = process.env.UserPoolTableName
const region = process.env.Region
const cloudWatchLogsRoleArn = process.env.CloudWatchLogsRoleArn
const mfaEnabled = process.env.MfaEnabled
const userPoolId = process.env.UserPoolId

const userPoolSyncer: UserPoolSyncer = new UserPoolSyncer(userPoolId, mfaEnabled, tableName, cloudWatchLogsRoleArn, new DocumentClient({region: region}), new CognitoIdentityServiceProvider({region: region}))

export const handler = async (event: any) => { 
  try { 
     
    await userPoolSyncer.sync() 
 
    return {  
      status: 200  
    } 
  } catch (exception) { 
    return {  
      status: 500
    } 
  } 
} 