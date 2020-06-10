// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CompletionStatus, StatusTypes, ICustomResourceRequest } from "./custom-resource-handler";

import * as uuid from 'uuid';
const axios = require('axios');

async function handleCreate(props: any): Promise<CompletionStatus> {
  try {
    return {
      Status: StatusTypes.Success,
      Data: { SOLUTION_UUID: uuid.v4(), APP_ID: uuid.v4(), BUCKET_NAME_TOKEN: uuid.v4().split('-').pop() }
    }
  } catch (error) {
    return {
      Status: StatusTypes.Failed,
      Data: error
    }
  }
}

async function handleUpdate(): Promise<CompletionStatus> {
  return Promise.resolve({
    Status: StatusTypes.Success,
    Data: { Message: 'No action required for update' }
  })
}

async function handleDelete(): Promise<CompletionStatus> {
  return Promise.resolve({
    Status: StatusTypes.Success,
    Data: { Message: 'No action required for delete' }
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
        response = await handleUpdate()
        break
      case 'Delete':
        response = await handleDelete()
        break
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
  } finally {
    //console.log(result)
    const response = await sendResponse(event, context.logStreamName, result)
    return response.status
  }
}
