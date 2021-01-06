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
const axios = require('axios');
const cfn = new AWS.CloudFormation();
function handleCreate(props) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const listInstancesParams = {
                StackSetName: props.StackSetId
            };
            console.log('Listing StackSet Instances', listInstancesParams);
            const response = yield cfn.listStackInstances(listInstancesParams).promise();
            console.log('List StackSet Instances Response', response);
            const primaryStackSetInstanceId = response.Summaries.find(summary => summary.Region === props.PrimaryRegion).StackId;
            const secondaryStackSetInstanceId = response.Summaries.find(summary => summary.Region === props.SecondaryRegion).StackId;
            const primaryInstanceOutputs = yield getStackSetInstanceOutputs(primaryStackSetInstanceId, props.PrimaryRegion);
            const secondaryInstanceOutputs = yield getStackSetInstanceOutputs(secondaryStackSetInstanceId, props.SecondaryRegion);
            return {
                Status: custom_resource_handler_1.StatusTypes.Success,
                Data: {
                    PrimaryRoutingLayerApiId: primaryInstanceOutputs.find(output => output.OutputKey === 'RoutingLayerApiId').OutputValue,
                    PrimaryPhotosApiId: primaryInstanceOutputs.find(output => output.OutputKey === 'PhotosApiId').OutputValue,
                    PrimaryObjectStoreBucket: primaryInstanceOutputs.find(output => output.OutputKey === 'ObjectStoreBucketName').OutputValue,
                    SecondaryRoutingLayerApiId: secondaryInstanceOutputs.find(output => output.OutputKey === 'RoutingLayerApiId').OutputValue,
                    SecondaryPhotosApiId: secondaryInstanceOutputs.find(output => output.OutputKey === 'PhotosApiId').OutputValue,
                    SecondaryObjectStoreBucket: secondaryInstanceOutputs.find(output => output.OutputKey === 'ObjectStoreBucketName').OutputValue
                }
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
function getStackSetInstanceOutputs(stackSetInstanceId, region) {
    return __awaiter(this, void 0, void 0, function* () {
        const regionalCfn = new AWS.CloudFormation({ region });
        const describeStacksParams = {
            StackName: stackSetInstanceId
        };
        console.log('Describing Stack Instance', describeStacksParams);
        const response = yield regionalCfn.describeStacks(describeStacksParams).promise();
        console.log(`Describe Stack Instance Response: ${JSON.stringify(response, null, 2)}`);
        return response.Stacks.find(stack => stack.StackId === stackSetInstanceId).Outputs;
    });
}
function processEvent(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            if (event.RequestType === 'Create') {
                response = yield handleCreate(event.ResourceProperties);
            }
            else {
                response = {
                    Status: custom_resource_handler_1.StatusTypes.Success,
                    Data: { Message: `No action required for ${event.RequestType}` }
                };
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
    return __awaiter(this, void 0, void 0, function* () {
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
    const response = yield sendResponse(event, context.logStreamName, result);
    return response.status;
});
//# sourceMappingURL=index.js.map