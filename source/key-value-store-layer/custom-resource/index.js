// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk')
const cfn = require('./cfn');


exports.handler = async (event, context, callback) => {

  console.log(`event: ${JSON.stringify(event,null,2)}`);
    
  const resource = event.ResourceProperties.Resource;
  const config = event.ResourceProperties;
  let responseData = {};

  try {
    if (event.RequestType === 'Create') {

      if (resource === 'CreateDynamoDBGlobalTable') {
        const tableName = config.TableName
        const primaryRegion = config.PrimaryRegion
        const secondaryRegion = config.SecondaryRegion

        const createPrimaryTable = createReplicaTableInRegion(tableName, primaryRegion)
        const createSecondaryTable = createReplicaTableInRegion(tableName, secondaryRegion)
        await Promise.all([createPrimaryTable, createSecondaryTable])
  
        await createGlobalTable(tableName, primaryRegion, secondaryRegion)

        responseData = {
          PrimaryCommentsTable: tableName,
          SecondaryCommentsTable: tableName
        }
      }

    }

    if (event.RequestType === 'Update') {
        //Update not required 
    }
    
    if (event.RequestType === 'Delete') {
        //Delete not required 
    }
      
    await cfn.send(event, context, 'SUCCESS', responseData, resource);
  } 
  catch (err) {
    console.log(err, err.stack);
    cfn.send(event, context, 'FAILED',{},resource);
  }
}

function createReplicaTableInRegion(tableName, region) {
  const dynamoDb = new AWS.DynamoDB({ region })
  return dynamoDb.createTable({
    TableName: tableName,
      AttributeDefinitions: [
        {
          AttributeName: 'commentId',
          AttributeType: 'S',
        },
        {
          AttributeName: 'photoId',
          AttributeType: 'S',
        }
      ],
      KeySchema: [
        {
          AttributeName: 'commentId',
          KeyType: 'HASH',
        }
      ],
      StreamSpecification: {
        StreamEnabled: true,
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
      BillingMode: 'PAY_PER_REQUEST',
      GlobalSecondaryIndexes: [
        {
          IndexName: 'photoId',
          KeySchema: [
            {
              AttributeName: 'photoId',
              KeyType: 'HASH',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          }
        }
      ],
      SSESpecification: {
        Enabled: true
      }
  }).promise()
}

function createGlobalTable(tableName, primaryRegion, secondaryRegion) {
  const dynamoDb = new AWS.DynamoDB({ region: primaryRegion })

  return dynamoDb.createGlobalTable({
    GlobalTableName: tableName,
    ReplicationGroup: [
      { RegionName: primaryRegion },
      { RegionName: secondaryRegion }
    ]
  }).promise()
}