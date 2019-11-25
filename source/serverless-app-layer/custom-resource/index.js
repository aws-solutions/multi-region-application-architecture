// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const cfn = require('./cfn');
const AWS = require('aws-sdk')

exports.handler = async (event, context) => {
  console.log(`event: ${JSON.stringify(event,null,2)}`);
  
  const resource = event.ResourceProperties.Resource;
  const config = event.ResourceProperties;
  let responseData = {};

  try {
    if (event.RequestType === 'Create') {
      if (resource === 'PrimaryAppLayer' || resource === 'SecondaryAppLayer') {

        const isPrimary = resource === 'PrimaryAppLayer'

        responseData = await createAppStack(config.Region, config.StackName, config.TemplateUrl,
          config.CommentsTable, config.UserPoolId, isPrimary)

        console.log(`returning AppLayer responseData: ${JSON.stringify(responseData)}`)
      }
    }
    if (event.RequestType === 'Update') {
      //Update not required
    }
    
    if (event.RequestType === 'Delete') {

      if (resource === 'PrimaryAppLayer' || resource === 'SecondaryAppLayer') {
          const stackToDelete = getStackName(config.StackName, config.Region)
          const cloudFormation = new AWS.CloudFormation({ region: config.Region })
          await cloudFormation.deleteStack({
            StackName: stackToDelete
          }).promise()
      }
    }
    
    await cfn.send(event, context, 'SUCCESS', responseData);
  } 
  catch (err) {
      console.log(err, err.stack);
      cfn.send(event, context, 'FAILED',{},resource);
  }
}

function getStackName(parentStackName, region) {
  return `${parentStackName}-${region}-ServerlessApp`
}

async function createAppStack(region, parentStackName, templateUrl, 
  commentsTable, userPoolId, isPrimary) {

  const stackName = getStackName(parentStackName, region)
  const cloudFormation = new AWS.CloudFormation({ region })
  await cloudFormation.createStack({
    StackName: stackName,
    TemplateURL: templateUrl,
    Parameters: [
      { ParameterKey: 'CommentsTableName', ParameterValue: commentsTable },
      { ParameterKey: 'UserPoolId', ParameterValue: userPoolId }
    ],
    Capabilities: [
        'CAPABILITY_IAM'
    ]
  }).promise()

  const commentsApiEndpoint = await getApiGatewayEndpoint(cloudFormation, stackName, region)

  if (isPrimary) {
    return {
      PrimaryCommentsApi: commentsApiEndpoint
    }
  } else {
    return {
      SecondaryCommentsApi: commentsApiEndpoint
    }
  }
}

async function getApiGatewayEndpoint(cloudFormation, stackName, region) {
  try {

    console.log(`waiting for stack to create: ${stackName}`)
    await cloudFormation.waitFor('stackCreateComplete', { StackName: stackName }).promise()
    console.log(`stack created: ${stackName}`)

    const stackDescription = await cloudFormation.describeStackResources({
      StackName: stackName
    }).promise()

    const apiGatewayResource = stackDescription.StackResources.find(r => r.LogicalResourceId === 'ApiGateway')
    const apiGatewayId = apiGatewayResource.PhysicalResourceId
    console.log(`ApiGateway id: ${apiGatewayId}`)

    // The API Gateway REST Invoke URL is always specified in this format
    return `https://${apiGatewayId}.execute-api.${region}.amazonaws.com/prod/`

  } catch (error) {
    console.log(`error getting API Gateway Rest API Endpoint ${error}`)
    return error
  }
}
