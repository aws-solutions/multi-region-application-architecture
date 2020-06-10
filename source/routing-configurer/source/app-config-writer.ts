// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IAppConfigWriterProperties, IAppConfig } from "./custom-resource-handler";
import * as AWS from 'aws-sdk';
const axios = require('axios');

async function handleCreate(props: IAppConfigWriterProperties): Promise<CompletionStatus> {
    try {
        if (!props.CurrentRegion) { throw new Error('CurrentRegion was not supplied'); }
        if (!props.IdentityPoolId) { throw new Error('IdentityPoolId was not supplied'); }
        if (!props.KeyValueStoreTableName) { throw new Error('KeyValueStoreTableName was not supplied'); }
        if (!props.ObjectStoreBucketName) { throw new Error('ObjectStoreBucketName was not supplied'); }
        if (!props.UserPoolClientId) { throw new Error('UserPoolClientId was not supplied'); }
        if (!props.UserPoolId) { throw new Error('UserPoolId was not supplied'); }
        if (!props.AppApi) { throw new Error('AppApi was not supplied'); }

        const s3 = new AWS.S3();
        const isSecondaryRegion = props.SecondaryRegion === props.CurrentRegion;

        await Promise.all([props.PrimaryConsoleBucket, props.SecondaryConsoleBucket].map(async (bucketName) => {
            const key = `console/${isSecondaryRegion ? 'secondaryApiEndpoint.json' : 'primaryApiEndpoint.json'}`;
            await s3.putObject({
                Bucket: bucketName,
                Key: key,
                Body: Buffer.from(JSON.stringify({ state: `${props.ApiEndpointGetState}${props.AppId}` }))
            }).promise();
            console.log(`Successfully wrote ${bucketName}/${key}`);
        }));

        const appConfig: IAppConfig = {
            region: props.CurrentRegion,
            identityPoolId: props.IdentityPoolId,
            keyValueStoreTableName: props.KeyValueStoreTableName,
            objectStoreBucketName: props.ObjectStoreBucketName,
            userPoolClientId: props.UserPoolClientId,
            userPoolId: props.UserPoolId,
            photosApi: props.AppApi
        };

        await Promise.all([props.PrimaryConsoleBucket, props.SecondaryConsoleBucket].map(async (bucketName) => {
            const key = `console/${isSecondaryRegion ? 'secondaryAppConfig.json' : 'primaryAppConfig.json'}`;
            await s3.putObject({
                Bucket: bucketName,
                Key: key,
                Body: Buffer.from(JSON.stringify(appConfig))
            }).promise();
            console.log(`Successfully wrote ${bucketName}/${key}`);
        }));

        return {
            Status: StatusTypes.Success,
            Data: { Message: `Successfully wrote API Endpoint URL and App Config for ${props.CurrentRegion}` }
        }
    } catch (error) {
        console.error(error);
        return {
            Status: StatusTypes.Failed,
            Data: { Message: error.message }
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
