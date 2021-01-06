// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import { CompletionStatus, StatusTypes, ICustomResourceRequest } from "./custom-resource-handler";
import * as AWS from 'aws-sdk';

const axios = require('axios');
const cfn = new AWS.CloudFormation();

async function handleCreate(props: ICustomResourceRequest["ResourceProperties"]): Promise<CompletionStatus> {
  try {
    const listInstancesParams: AWS.CloudFormation.ListStackInstancesInput = {
      StackSetName: props.StackSetId
    };

    console.log('Listing StackSet Instances', listInstancesParams);
    const response = await cfn.listStackInstances(listInstancesParams).promise();
    console.log('List StackSet Instances Response', response);

    const primaryStackSetInstanceId = response.Summaries.find(summary => summary.Region === props.PrimaryRegion).StackId;
    const secondaryStackSetInstanceId = response.Summaries.find(summary => summary.Region === props.SecondaryRegion).StackId;

    const primaryInstanceOutputs = await getStackSetInstanceOutputs(primaryStackSetInstanceId, props.PrimaryRegion);
    const secondaryInstanceOutputs = await getStackSetInstanceOutputs(secondaryStackSetInstanceId, props.SecondaryRegion);

    return {
      Status: StatusTypes.Success,
      Data: {
        PrimaryRoutingLayerApiId: primaryInstanceOutputs.find(output => output.OutputKey === 'RoutingLayerApiId').OutputValue,
        PrimaryPhotosApiId: primaryInstanceOutputs.find(output => output.OutputKey === 'PhotosApiId').OutputValue,
        PrimaryObjectStoreBucket: primaryInstanceOutputs.find(output => output.OutputKey === 'ObjectStoreBucketName').OutputValue,
        SecondaryRoutingLayerApiId: secondaryInstanceOutputs.find(output => output.OutputKey === 'RoutingLayerApiId').OutputValue,
        SecondaryPhotosApiId: secondaryInstanceOutputs.find(output => output.OutputKey === 'PhotosApiId').OutputValue,
        SecondaryObjectStoreBucket: secondaryInstanceOutputs.find(output => output.OutputKey === 'ObjectStoreBucketName').OutputValue
      }
    };
  } catch (error) {
    return {
      Status: StatusTypes.Failed,
      Data: error
    };
  }
}

async function getStackSetInstanceOutputs(stackSetInstanceId: string, region: string): Promise<any[]> {
  const regionalCfn = new AWS.CloudFormation({region});

  const describeStacksParams: AWS.CloudFormation.DescribeStacksInput = {
    StackName: stackSetInstanceId
  };

  console.log('Describing Stack Instance', describeStacksParams);
  const response = await regionalCfn.describeStacks(describeStacksParams).promise();
  console.log(`Describe Stack Instance Response: ${JSON.stringify(response, null, 2)}`);

  return response.Stacks.find(stack => stack.StackId === stackSetInstanceId).Outputs;
}

async function processEvent(event: ICustomResourceRequest): Promise<CompletionStatus> {
  let response: CompletionStatus;

  try {
    if (event.RequestType === 'Create') {
      response = await handleCreate(event.ResourceProperties);
    } else {
      response = {
        Status: StatusTypes.Success,
        Data: { Message: `No action required for ${event.RequestType}` }
      };
    }
  } catch (error) {
    response = {
      Status: StatusTypes.Failed,
      Data: error
    }
  }

  return response;
}

async function withTimeout(func, timeoutMillis): Promise<CompletionStatus> {
  let timeoutId
  let timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject({
        Status: StatusTypes.Failed,
        Data: { Message: 'Processing the event timed out' }
      })
    }, timeoutMillis)
  })

  return Promise.race([func, timeout]).then(result => {
    clearTimeout(timeoutId)
    return result
  })
}

function sendResponse(event: ICustomResourceRequest, logStreamName: string, response: CompletionStatus) {
  console.log(`sending response status: '${response.Status}' to CFN with data: ${JSON.stringify(response.Data)}`)

  const reason = `See the details in CloudWatch Log Stream: ${logStreamName}`

  const responseBody = JSON.stringify({
    Status: response.Status.toString(),
    Reason: reason,
    PhysicalResourceId: event.LogicalResourceId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: response.Data,
  })

  const config = {
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  }

  return axios.put(event.ResponseURL, responseBody, config)
}

exports.handler = async (event: ICustomResourceRequest, context) => {
  console.log(`Received event: ${JSON.stringify(event)}`);

  let result: CompletionStatus

  try {
    // To prevent CloudFormation Stack creation hangs, make sure to return a response if 
    // the function doesn't process in the time allotted.  
    const timeout = context.getRemainingTimeInMillis() - 1000
    result = await withTimeout(processEvent(event), timeout)
  } catch (error) {
    console.log(`error: ${error}\n${error.stack}`)
    result = {
      Status: StatusTypes.Failed,
      Data: error
    }
  }

  const response = await sendResponse(event, context.logStreamName, result);
  return response.status;
}
