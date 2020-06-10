// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IResourceProperties, ICustomResourceResponseData } from "./custom-resource-handler";

const axios = require('axios')
import * as AWS from 'aws-sdk';

async function createBuckets(fomattedStackName: string, primaryRegion: string, secondaryRegion: string, bucketNameToken: string): Promise<ICustomResourceResponseData> {
  const createdBuckets: ICustomResourceResponseData = { PrimaryBucketName: null, PrimaryLogBucketName: null, SecondaryBucketName: null, SecondaryLogBucketName: null };

  // Create the log buckets
  await Promise.all([primaryRegion, secondaryRegion].map(async (region) => {
    const s3 = new AWS.S3({ region });
    const bucketName = `${fomattedStackName}-presentation-${bucketNameToken}-${region}-logs`;
    let params: any = { Bucket: bucketName };

    if (region !== 'us-east-1') {
      params['CreateBucketConfiguration'] = { LocationConstraint: region };
    }

    region === primaryRegion ? createdBuckets.PrimaryLogBucketName = bucketName : createdBuckets.SecondaryLogBucketName = bucketName;

    console.log(`Creating bucket: ${JSON.stringify(params)}`);
    await s3.createBucket(params).promise();

    params = { Bucket: bucketName };
    console.log(`Checking if bucket exists: ${JSON.stringify(params)}`);
    await s3.headBucket(params).promise();

    console.log(`Successfully created bucket: ${JSON.stringify(params)}`);

    params = {
      Bucket: bucketName,
      ACL: 'log-delivery-write'
    };
    console.log(`Putting bucket ACL: ${JSON.stringify(params)}`);
    await s3.putBucketAcl(params).promise();
    console.log(`Successfully put bucket ACL: ${JSON.stringify(params)}`);

    params = {
      Bucket: bucketName,
      ServerSideEncryptionConfiguration: {
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'aws:kms' }
          }
        ]
      }
    };
    console.log(`Putting bucket encryption: ${JSON.stringify(params)}`)
    await s3.putBucketEncryption(params).promise();
    console.log(`Successfully put bucket encryption: ${JSON.stringify(params)}`);

    params = {
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true
      }
    };
    console.log(`Putting public access block: ${JSON.stringify(params)}`)
    await s3.putPublicAccessBlock(params).promise();
    console.log(`Successfully put public access block: ${JSON.stringify(params)}`);

    console.log(`Bucket Created: ${bucketName}`);
  }));

  // Create the console buckets
  await Promise.all([primaryRegion, secondaryRegion].map(async (region) => {
    const s3 = new AWS.S3({ region });
    const bucketName = `${fomattedStackName}-presentation-${bucketNameToken}-${region}`;
    let params: any = { Bucket: bucketName };

    if (region !== 'us-east-1') {
      params['CreateBucketConfiguration'] = { LocationConstraint: region };
    }

    region === primaryRegion ? createdBuckets.PrimaryBucketName = bucketName : createdBuckets.SecondaryBucketName = bucketName;

    console.log(`Creating bucket: ${JSON.stringify(params)}`);
    await s3.createBucket(params).promise();

    params = { Bucket: bucketName };
    console.log(`Checking if bucket exists: ${JSON.stringify(params)}`);
    await s3.headBucket(params).promise();

    console.log(`Successfully created bucket: ${JSON.stringify(params)}`);

    params = {
      Bucket: bucketName,
      BucketLoggingStatus: {
        LoggingEnabled: {
          TargetBucket: region === secondaryRegion ? createdBuckets.SecondaryLogBucketName : createdBuckets.PrimaryLogBucketName,
          TargetPrefix: 'console-bucket-access/'
        }
      }
    };
    console.log(`Putting bucket logging: ${JSON.stringify(params)}`)
    await s3.putBucketLogging(params).promise();
    console.log(`Successfully put bucket logging: ${JSON.stringify(params)}`);

    console.log(`Bucket Created: ${bucketName}`);
  }));

  return Promise.resolve(createdBuckets);
}

export async function handleCreate(props: IResourceProperties): Promise<CompletionStatus> {
  const s3 = new AWS.S3();

  try {
    const bucketNames = await createBuckets(props.FormattedStackName, props.PrimaryRegion, props.SecondaryRegion, props.BucketNameToken);
    console.log(`Buckets created: ${JSON.stringify(bucketNames)}`);

    // get file manifest from s3
    const params = {
      Bucket: props.SrcBucket,
      Key: `${props.SrcPath}/${props.ManifestFile}`
    };

    const data = await s3.getObject(params).promise();
    const manifest: string[] = JSON.parse(data.Body.toString());
    console.log('Manifest:', JSON.stringify(manifest, null, 2));

    // Loop through manifest and copy files to the destination buckets
    await Promise.all(manifest.map(async (file) => {
      let params = {
        Bucket: bucketNames.PrimaryBucketName,
        CopySource: `${props.SrcBucket}/${props.SrcPath}/${file}`,
        Key: file
      };

      console.log(`Copying: ${JSON.stringify(params)}`);
      let resp = await s3.copyObject(params).promise();
      console.log('file copied to s3: ', resp);

      params.Bucket = bucketNames.SecondaryBucketName;
      console.log(`Copying: ${JSON.stringify(params)}`);
      resp = await s3.copyObject(params).promise();
      console.log('file copied to s3: ', resp);
    }));

    return Promise.resolve({
      Status: StatusTypes.Success,
      Data: bucketNames
    })
  } catch (err) {
    throw err;
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
  } finally {
    //console.log(result)
    const response = await sendResponse(event, context.logStreamName, result)
    return response.status
  }
}
