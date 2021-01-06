// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IResourceProperties } from "./custom-resource-handler";

const axios = require('axios')
import * as AWS from 'aws-sdk';

export async function handleCreate(props: IResourceProperties): Promise<CompletionStatus> {
  const s3 = new AWS.S3();

  // get file manifest from s3
  const getManifestParams = {
    Bucket: props.SrcBucket,
    Key: `${props.SrcPath}/${props.ManifestFile}`
  };

  const data = await s3.getObject(getManifestParams).promise();
  const manifest: string[] = JSON.parse(data.Body.toString());
  console.log('Manifest:', JSON.stringify(manifest, null, 2));

  // Loop through manifest and copy files to the destination buckets
  await Promise.all(manifest.map(async (file) => {
    let params = {
      Bucket: props.ConsoleBucket,
      CopySource: `${props.SrcBucket}/${props.SrcPath}/${file}`,
      Key: file
    };

    console.log(`Copying: ${JSON.stringify(params)}`);
    let resp = await s3.copyObject(params).promise();
    console.log('file copied to s3: ', resp);
  }));

  await s3.putObject({
    Bucket: props.ConsoleBucket,
    Key: 'console/uiConfig.json',
    Body: Buffer.from(JSON.stringify({
      identityPoolId: props.IdentityPoolId,
      userPoolClientId: props.UserPoolClientId,
      userPoolId: props.UserPoolId,
      uiRegion: props.UIRegion,
      primary: {
        stateUrl: `${props.PrimaryRoutingLayerEndpoint}/state/${props.AppId}`,
        objectStoreBucketName: props.PrimaryObjectStoreBucket,
        photosApi: props.PrimaryPhotosApiEndpoint,
        region: props.PrimaryRegion
      },
      secondary: {
        stateUrl: `${props.SecondaryRoutingLayerEndpoint}/state/${props.AppId}`,
        objectStoreBucketName: props.SecondaryObjectStoreBucket,
        photosApi: props.SecondaryPhotosApiEndpoint,
        region: props.SecondaryRegion
      }
    }))
  }).promise();
  console.log('Successfully wrote uiConfig.json');

  return Promise.resolve({
    Status: StatusTypes.Success,
    Data: { Message: 'Successfully configured Demo UI' }
  });
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

  const response = await sendResponse(event, context.logStreamName, result);
  return response.status;
}
