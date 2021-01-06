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
const axios = require('axios');
const AWS = require("aws-sdk");
function handleCreate(props) {
    return __awaiter(this, void 0, void 0, function* () {
        const s3 = new AWS.S3();
        // get file manifest from s3
        const getManifestParams = {
            Bucket: props.SrcBucket,
            Key: `${props.SrcPath}/${props.ManifestFile}`
        };
        const data = yield s3.getObject(getManifestParams).promise();
        const manifest = JSON.parse(data.Body.toString());
        console.log('Manifest:', JSON.stringify(manifest, null, 2));
        // Loop through manifest and copy files to the destination buckets
        yield Promise.all(manifest.map((file) => __awaiter(this, void 0, void 0, function* () {
            let params = {
                Bucket: props.ConsoleBucket,
                CopySource: `${props.SrcBucket}/${props.SrcPath}/${file}`,
                Key: file
            };
            console.log(`Copying: ${JSON.stringify(params)}`);
            let resp = yield s3.copyObject(params).promise();
            console.log('file copied to s3: ', resp);
        })));
        yield s3.putObject({
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
            Status: custom_resource_handler_1.StatusTypes.Success,
            Data: { Message: 'Successfully configured Demo UI' }
        });
    });
}
exports.handleCreate = handleCreate;
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
//# sourceMappingURL=index.js.map