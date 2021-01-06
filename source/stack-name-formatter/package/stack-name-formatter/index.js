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
exports.handleCreate = void 0;
/**
 * @author Solution Builders
 */
const custom_resource_handler_1 = require("./custom-resource-handler");
const metrics_1 = require("../utils/metrics");
const axios = require('axios');
function handleCreate(props) {
    return __awaiter(this, void 0, void 0, function* () {
        props.StackName = props.StackName.toLowerCase();
        return Promise.resolve({
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Value: props.StackName.length < 8 ? props.StackName : props.StackName.substr(0, 7) }
        });
    });
}
exports.handleCreate = handleCreate;
function processEvent(event) {
    return __awaiter(this, void 0, void 0, function* () {
        let response;
        try {
            switch (event.RequestType) {
                case 'Create':
                    response = yield handleCreate(event.ResourceProperties);
                    break;
                case 'Update':
                case 'Delete':
                    response = {
                        Status: custom_resource_handler_1.StatusTypes.Success,
                        Data: { Message: `No action required for ${event.RequestType}` }
                    };
                    break;
            }
            if (process.env.SEND_METRICS === 'Yes') {
                yield sendMetric({ EventName: `Solution ${event.RequestType}`, PrimaryRegion: process.env.PRIMARY_REGION, SecondaryRegion: process.env.SECONDARY_REGION });
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
    console.log(`response body: ${responseBody}}`);
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
//# sourceMappingURL=index.js.map