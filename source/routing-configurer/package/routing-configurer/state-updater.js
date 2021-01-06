"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author Solution Builders
 */
const custom_resource_handler_1 = require("./custom-resource-handler");
const AWS = require("aws-sdk");
const metrics_1 = require("../utils/metrics");
const axios = require('axios');
function handleCreate(props) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!props.TableName) {
                throw new Error('TableName was not supplied');
            }
            if (!props.AppId) {
                throw new Error('AppId was not supplied');
            }
            if (!props.NewState) {
                throw new Error('NewState was not supplied');
            }
            yield updateState(props.TableName, props.AppId, props.NewState);
            return {
                Status: custom_resource_handler_1.StatusTypes.Success,
                Data: { Message: `Successfully updated ${props.TableName} and set appId (${props.AppId}) to ${props.NewState}` }
            };
        }
        catch (error) {
            console.error(error);
            return {
                Status: custom_resource_handler_1.StatusTypes.Failed,
                Data: { Message: error.message }
            };
        }
    });
}
function handleUpdate() {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Message: 'No action required for update' }
        };
    });
}
function handleDelete() {
    return __awaiter(this, void 0, void 0, function* () {
        return {
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Message: 'No action required for delete' }
        };
    });
}
function processEvent(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            switch (event.RequestType) {
                case 'Create':
                    response = yield handleCreate(event.ResourceProperties);
                    break;
                case 'Update':
                    response = yield handleUpdate();
                    break;
                case 'Delete':
                    response = yield handleDelete();
                    break;
            }
        }
        catch (error) {
            response = {
                Status: custom_resource_handler_1.StatusTypes.Failed,
                Data: error
            };
        }
        return response;
    });
}
function withTimeout(func, timeoutMillis) {
    let timeoutId;
    let timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject({
                Status: custom_resource_handler_1.StatusTypes.Failed,
                Data: { Message: 'Processing the event timed out' }
            });
        }, timeoutMillis);
    });
    return Promise.race([func, timeout]).then(result => {
        clearTimeout(timeoutId);
        return result;
    });
}
function sendResponse(event, logStreamName, response) {
    console.log(`sending response status: '${response.Status}' to CFN with data: ${JSON.stringify(response.Data)}`);
    const reason = `See the details in CloudWatch Log Stream: ${logStreamName}`;
    const responseBody = JSON.stringify({
        Status: response.Status.toString(),
        Reason: reason,
        PhysicalResourceId: event.LogicalResourceId,
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
        Data: response.Data,
    });
    const config = {
        headers: {
            "content-type": "",
            "content-length": responseBody.length
        }
    };
    return axios.put(event.ResponseURL, responseBody, config);
}
/**
 * Class to validate function input and hold references to important variables. Intended to be
 * used when this function is manually invoked, as opposed to being invoked by CloudFormation
 */
class ManualInvocationFunctionData {
    /**
     * @constructor
     * @param event - The event payload that was passed when this function was invoked
     */
    constructor(event) {
        this.validStates = ['active', 'fenced', 'failover'];
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
function updateState(tableName, appId, newState) {
    return __awaiter(this, void 0, void 0, function* () {
        const docClient = new AWS.DynamoDB.DocumentClient();
        const updateParams = {
            TableName: tableName,
            Key: { appId: appId },
            UpdateExpression: 'set #STAT = :stat',
            ConditionExpression: 'attribute_not_exists(#AID) OR (attribute_exists(#STAT) AND #STAT <> :stat)',
            ExpressionAttributeNames: { '#STAT': 'state', '#AID': 'appId' },
            ExpressionAttributeValues: { ':stat': newState }
        };
        console.log('Updating State', updateParams);
        yield docClient.update(updateParams).promise();
        console.log(`Successfully updated ${tableName} and set appId (${appId}) to ${newState}`);
        if (process.env.SEND_METRICS === 'Yes') {
            yield sendMetric({ EventName: 'STATE_UPDATED', EventValue: newState });
        }
    });
}
function sendMetric(metricData) {
    return __awaiter(this, void 0, void 0, function* () {
        const metrics = new metrics_1.Metrics();
        const metricProperties = {
            Solution: process.env.SOLUTION_ID,
            UUID: process.env.UUID,
            Version: process.env.VERSION,
            Data: Object.assign({}, metricData)
        };
        yield metrics.sendAnonymousMetric(metricProperties);
    });
}
exports.handler = (event, context) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Received event: ${JSON.stringify(event)}`);
    if (event.StackId && event.StackId.trim() !== '') {
        // Function was invoked by CloudFormation
        let result;
        try {
            // To prevent CloudFormation Stack creation hangs, make sure to return a response if 
            // the function doesn't process in the time allotted.  
            const timeout = context.getRemainingTimeInMillis() - 1000;
            result = yield withTimeout(processEvent(event), timeout);
        }
        catch (error) {
            console.log(`error: ${error}\n${error.stack}`);
            result = {
                Status: custom_resource_handler_1.StatusTypes.Failed,
                Data: error
            };
        }
        finally {
            //console.log(result)
            const response = yield sendResponse(event, context.logStreamName, result);
            return response.status;
        }
    }
    else {
        // Function was invoked manually
        const functionData = new ManualInvocationFunctionData(event);
        yield updateState(functionData.appConfigTableName, functionData.appId, functionData.newState);
        const response = {
            statusCode: 200,
            body: JSON.stringify(`Successfully updated application state to '${functionData.newState}'`)
        };
        return response;
    }
});
//# sourceMappingURL=state-updater.js.map