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
const AWS = require('aws-sdk');
const axios = require('axios');
function handleCreate(props) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dynamoDb = new AWS.DynamoDB({ region: props.Regions[0] });
            const replicationGroup = props.Regions.map(region => {
                return {
                    RegionName: region
                };
            });
            yield dynamoDb.createGlobalTable({
                GlobalTableName: props.TableName,
                ReplicationGroup: replicationGroup
            }).promise();
            return {
                Status: custom_resource_handler_1.StatusTypes.Success,
                Data: { Message: 'Successfully configured the DynamoDB Global Table' }
            };
        }
        catch (error) {
            return {
                Status: custom_resource_handler_1.StatusTypes.Failed,
                Data: error
            };
        }
    });
}
function handleUpdate() {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.resolve({
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Message: 'No action required for update' }
        });
    });
}
function handleDelete() {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.resolve({
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Message: 'No action required for delete' }
        });
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
exports.handler = (event, context) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Received event: ${JSON.stringify(event)}`);
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
});
//# sourceMappingURL=index.js.map