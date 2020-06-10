// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const AWS = require('aws-sdk');
const axios = require('axios')

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IResourceProperties } from './custom-resource-handler'

async function handleCreate(props: IResourceProperties): Promise<CompletionStatus> {

  const cfn = new AWS.CloudFormation()

  const parameters = props.Parameters.map(param => {
    const key = Object.keys(param)[0]
    const value = param[key]

    return {
      ParameterKey: key,
      ParameterValue: value
    }
  })

  try {
    let response = await cfn.createStackSet({
      StackSetName: props.StackSetName,
      TemplateURL: props.TemplateURL,
      AdministrationRoleARN: props.AdministrationRoleARN,
      ExecutionRoleName: props.ExecutionRoleName,
      Capabilities: props.Capabilities,
      Parameters: parameters
    }).promise()
    console.log(`Created new StackSet: ${props.StackSetName} with response: ${JSON.stringify(response)}`)
  
    response = await cfn.createStackInstances({
      StackSetName: props.StackSetName,
      Accounts: props.Accounts,
      Regions: props.Regions,
      OperationPreferences: {
        RegionOrder: props.OperationPreferences.RegionOrder,
        FailureToleranceCount: props.OperationPreferences.FailureToleranceCount,
        MaxConcurrentCount: props.OperationPreferences.MaxConcurrentCount
      }
    }).promise()
    console.log(`Created new Stack Instances for StackSet: ${props.StackSetName} with response: ${JSON.stringify(response)}`)
  
    return {
      Status: StatusTypes.Success,
      Data: { Message: 'Successfully created the StackSet and Stack Instances' }
    }
  } catch (error) {
    return {
      Status: StatusTypes.Failed,
      Data: error.message
    }
  }
}

async function handleUpdate(): Promise<CompletionStatus> {
  return Promise.resolve({
    Status: StatusTypes.Success,
    Data: { Message: 'No action required for update' }
  })
}

async function handleDelete(props: IResourceProperties): Promise<CompletionStatus> {

  const cfn = new AWS.CloudFormation()

  try {
    const response = await cfn.deleteStackInstances({
      StackSetName: props.StackSetName,
      Accounts: props.Accounts,
      Regions: props.Regions,
      RetainStacks: false,
    }).promise()
    console.log(`Deleted Stack Instances for StackSet: ${props.StackSetName} with response: ${JSON.stringify(response)}`)
  } catch (error) {
    console.log(`Error deleting Stack Instances for StackSet: ${props.StackSetName}\n${JSON.stringify(error)}`)
    return {
      Status: StatusTypes.Failed,
      Data: error.message
    }
  }

  // If a StackSet Instance is currently being deleted, we can't delete the StackSet itself yet
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const response = await cfn.deleteStackSet({
        StackSetName: props.StackSetName
      }).promise()
      console.log(`deleted StackSet: ${props.StackSetName} with response: ${JSON.stringify(response)}`)
      break;
    } catch (error) {
      console.log(`error when trying to delete StackSet: ${JSON.stringify(error)}`)
    }
  }

  return {
    Status: StatusTypes.Success,
    Data: { Message: 'Successfully deleted the StackSet and Stack Instances' }
  }
}

async function processEvent(event) {
  let response

  try {
    switch ( event.RequestType) {
      case 'Create':
        response = await handleCreate(event.ResourceProperties)
        break
      case 'Update':
        response = await handleUpdate()
        break
      case 'Delete':
        response = await handleDelete(event.ResourceProperties)
        break
    }
  } catch (error) {
    response = {
      Status: StatusTypes.Failed,
      Data: error.message
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

  return Promise.race([ func, timeout ]).then(result => {
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
      Data: error.message
    }
  } finally {
    //console.log(result)
    const response = await sendResponse(event, context.logStreamName, result)
    return response.status
  }
}
