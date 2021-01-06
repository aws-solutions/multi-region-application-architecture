// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IResourceProperties } from "./custom-resource-handler";
import { Metrics, IAnonymousMetricProperties } from '../utils/metrics';

const axios = require('axios')

export async function handleCreate(props: IResourceProperties): Promise<CompletionStatus> {
  props.StackName = props.StackName.toLowerCase();
  return Promise.resolve({
    Status: StatusTypes.Success,
    Data: { Value: props.StackName.length < 8 ? props.StackName : props.StackName.substr(0, 7) }
  })
}

async function processEvent(event) {
  let response

  try {
    switch (event.RequestType) {
      case 'Create':
        response = await handleCreate(event.ResourceProperties)
        break
      case 'Update':
      case 'Delete':
        response = {
          Status: StatusTypes.Success,
          Data: { Message: `No action required for ${event.RequestType}` }
        };
        break
    }

    if (process.env.SEND_METRICS === 'Yes') {
      await sendMetric({ EventName: `Solution ${event.RequestType}`, PrimaryRegion: process.env.PRIMARY_REGION, SecondaryRegion: process.env.SECONDARY_REGION });
    }
  } catch (error) {
    response = {
      Status: StatusTypes.Failed,
      Data: error
    }
  }

  return response
}

function withTimeout(func, timeoutMillis): Promise<CompletionStatus> {
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

  console.log(`response body: ${responseBody}}`)

  return axios.put(event.ResponseURL, responseBody, config)
}

exports.handler = async (event: ICustomResourceRequest, context) => {
  console.log(`Received event: ${JSON.stringify(event)}`)

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

  const response = await sendResponse(event, context.logStreamName, result)
  return response.status
}

async function sendMetric(metricData: any): Promise<void> {
  const metrics = new Metrics();
  const metricProperties: IAnonymousMetricProperties = {
    Solution: process.env.SOLUTION_ID,
    UUID: process.env.UUID,
    Version: process.env.VERSION,
    Data: Object.assign({}, metricData)
  };

  await metrics.sendAnonymousMetric(metricProperties);
}