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
      if (resource === 'PrimaryPresentationLayer' || resource === 'SecondaryPresentationLayer') {

        const isPrimary = resource === 'PrimaryPresentationLayer'

        responseData = await createPresentationLayerStack(config.Region, config.StackName, config.TemplateUrl,
          config.PhotosBucket, config.PhotosApi, config.UserPoolId, config.UserPoolClientId, isPrimary)

        console.log(`returning PrimaryPresentationLayer responseData: ${JSON.stringify(responseData)}`)
      }
    }
    if (event.RequestType === 'Update') {
      //Update not required
    }
    
    if (event.RequestType === 'Delete') {

      if (resource === 'PrimaryPresentationLayer' || resource === 'SecondaryPresentationLayer') {
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
  return `${parentStackName}-${region}-PresentationLayer-App`
}

async function createPresentationLayerStack(region, parentStackName, templateUrl, 
  photosBucket, photosApi, userPoolId, userPoolClientId, isPrimary) {

  const stackName = getStackName(parentStackName, region)
  const cloudFormation = new AWS.CloudFormation({ region })
  await cloudFormation.createStack({
    StackName: stackName,
    TemplateURL: templateUrl,
    Parameters: [
      { ParameterKey: 'UserPoolId', ParameterValue: userPoolId },
      { ParameterKey: 'UserPoolClientId', ParameterValue: userPoolClientId },
      { ParameterKey: 'PhotosBucket', ParameterValue: photosBucket },
      { ParameterKey: 'PhotosApi', ParameterValue: photosApi }
    ],
    Capabilities: [
        'CAPABILITY_IAM'
    ]
  }).promise()

  const consoleBucketResource = await getConsoleBucketResource(cloudFormation, stackName)
  const consoleCloudFrontResource = await getConsoleCloudFrontResource(cloudFormation, stackName, region)

  if (isPrimary) {
    return {
      PrimaryConsoleBucket: consoleBucketResource,
      PrimaryCloudFrontDomain: consoleCloudFrontResource
    }
  } else {
    return {
      SecondaryConsoleBucket: consoleBucketResource,
      SecondaryCloudFrontDomain: consoleCloudFrontResource
    }
  }
}

async function getConsoleBucketResource(cloudFormation, stackName) {
  try {
    while (true) {
      const stackDescription = await cloudFormation.describeStackResources({
        StackName: stackName
      }).promise()
  
      const consoleBucketResource = stackDescription.StackResources.find(r => r.LogicalResourceId === 'ConsoleBucket')
      if (consoleBucketResource === undefined || consoleBucketResource.PhysicalResourceId === undefined) {
        console.log('ConsoleBucket resource not created yet, waiting 3 seconds and retrying')
        await waitForTimeout(3000)
        continue
      }

      console.log(`found ConsoleBucket: ${JSON.stringify(consoleBucketResource)}`)
      console.log(`ConsoleBucket Resource PhysicalResourceId: ${consoleBucketResource.PhysicalResourceId}`)

      return consoleBucketResource.PhysicalResourceId
    }

  } catch (error) {
    console.log(`error getting ConsoleBucket Resource: ${error}`)
    return error
  }
}

async function getConsoleCloudFrontResource(cloudFormation, stackName, region) {
  try {
    while (true) {

      const stackDescription = await cloudFormation.describeStackResources({
        StackName: stackName
      }).promise()
  
      const cloudFrontResource = stackDescription.StackResources.find(r => r.LogicalResourceId === 'ConsoleCloudFront')
      if (cloudFrontResource === undefined || cloudFrontResource.PhysicalResourceId === undefined) {
        console.log('CloudFront resource not created yet, waiting 3 seconds and retrying')
        await waitForTimeout(3000)
        continue
      }

      console.log(`found CloudFront Distribution: ${JSON.stringify(cloudFrontResource)}`)
      console.log(`CloudFront Resource PhysicalResourceId: ${cloudFrontResource.PhysicalResourceId}`)
  
      const cloudFront = new AWS.CloudFront({ region })
      const cloudFrontDistribution = await cloudFront.getDistribution({
        Id: cloudFrontResource.PhysicalResourceId
      }).promise()
  
      return cloudFrontDistribution.DomainName
    }
  } catch (error) {
    console.log(`error getting CloudFront Distribution DomainName: ${error}`)
    return error
  }
}

function waitForTimeout(timeoutMillis) {
  return new Promise(resolve => setTimeout(() => {
      resolve({
          Status: 'FAILED',
          Data: { Message: 'The Create request timed out' }
      })
  }, timeoutMillis))
}
