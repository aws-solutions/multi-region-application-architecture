// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CompletionStatus, StatusTypes, ICustomResourceRequest, IStateUpdaterProperties } from "./custom-resource-handler";
import * as AWS from 'aws-sdk';
import { Metrics, IAnonymousMetricProperties } from './metrics';

const axios = require('axios');

async function handleCreate(props: IStateUpdaterProperties): Promise<CompletionStatus> {
    try {
        if (!props.TableName) { throw new Error('TableName was not supplied'); }
        if (!props.AppId) { throw new Error('AppId was not supplied'); }
        if (!props.NewState) { throw new Error('NewState was not supplied'); }

        await updateState(props.TableName, props.AppId, props.NewState);
        return {
            Status: StatusTypes.Success,
            Data: { Message: `Successfully updated ${props.TableName} and set appId (${props.AppId}) to ${props.NewState}` }
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

async function processEvent(event: ICustomResourceRequest) {
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

/**
 * Class to validate function input and hold references to important variables. Intended to be
 * used when this function is manually invoked, as opposed to being invoked by CloudFormation
 */
class ManualInvocationFunctionData {
    private validStates = ['active', 'fenced', 'failover'];
    appConfigTableName: string;
    appId: string;
    newState: string;

    /**
     * @constructor
     * @param event - The event payload that was passed when this function was invoked
     */
    constructor(event: IStateUpdaterProperties) {
        if (!event.AppId || event.AppId.trim() === '') {
            throw new Error('AppId was not found in the event payload');
        }
        this.appId = event.AppId;

        if (!event.TableName || event.TableName.trim() === '') {
            throw new Error('TableName was not found in the event payload');
        }
        this.appConfigTableName = event.TableName;

        if (!event.NewState || event.NewState.trim() === '') {
            throw new Error('NewState was not found in the event payload');
        }
        this.newState = event.NewState.trim().toLowerCase();

        if (!this.validStates.includes(this.newState)) {
            throw new Error(`${this.newState} is not a valid state. Accepted values are: ${JSON.stringify(this.validStates)}`);
        }
    }
}

async function updateState(tableName: string, appId: string, newState: string) {
    const docClient = new AWS.DynamoDB.DocumentClient();

    await docClient.update({
        TableName: tableName,
        Key: { appId: appId },
        UpdateExpression: 'set #STAT = :stat',
        ConditionExpression: 'attribute_not_exists(#AID) OR (attribute_exists(#STAT) AND #STAT <> :stat)',
        ExpressionAttributeNames: { '#STAT': 'state', '#AID': 'appId' },
        ExpressionAttributeValues: { ':stat': newState }
    }).promise();

    console.log(`Successfully updated ${tableName} and set appId (${appId}) to ${newState}`);

    if (process.env.SEND_METRICS === 'Yes') {
        await sendMetric({ EventName: 'STATE_UPDATED', EventValue: newState });
    }
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

exports.handler = async (event: any, context) => {
    console.log(`Received event: ${JSON.stringify(event)}`);
    if (event.StackId && event.StackId.trim() !== '') {
        // Function was invoked by CloudFormation
        let result: CompletionStatus;

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
    } else {
        // Function was invoked manually
        const functionData = new ManualInvocationFunctionData(event);
        await updateState(functionData.appConfigTableName, functionData.appId, functionData.newState);

        const response = {
            statusCode: 200,
            body: JSON.stringify(`Successfully updated application state to '${functionData.newState}'`)
        };
        return response;
    }
}
