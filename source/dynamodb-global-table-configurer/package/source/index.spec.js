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
/**
 * @author Solution Builders
 */
const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');
describe('DynamoDB Configurer Lambda: Custom Resource Create', () => {
    let axiosMock;
    beforeEach(() => {
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));
        axiosMock = new MockAdapter(axios);
        awsMock.mock('DynamoDB', 'createGlobalTable', emptySpy);
    });
    afterEach(() => {
        awsMock.restore();
        sinon.restore();
    });
    test('"Create" Custom Resource Action', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda');
                }
                return [200, {}];
            }
            catch (err) {
                console.error(err);
                return [500, {}];
            }
        });
        const lambdaFunction = require('./index');
        const resp = yield lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                TableName: 'table-name',
                Regions: ['region-1', 'region-2']
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
    test('"Create" Custom Resource Action - Missing TableName', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'FAILED') {
                    throw new Error('Success status not returned from Custom Resource Lambda');
                }
                return [200, {}];
            }
            catch (err) {
                console.error(err);
                return [500, {}];
            }
        });
        const lambdaFunction = require('./index');
        const resp = yield lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                Regions: ['region-1', 'region-2']
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
    test('"Create" Custom Resource Action - Missing Regions', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'FAILED') {
                    throw new Error('Success status not returned from Custom Resource Lambda');
                }
                return [200, {}];
            }
            catch (err) {
                console.error(err);
                return [500, {}];
            }
        });
        const lambdaFunction = require('./index');
        const resp = yield lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                TableName: 'table-name'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
});
describe('DynamoDB Configurer Lambda - NOPs', () => {
    let axiosMock;
    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });
    test('Testing "Update" Custom Resource Action', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda');
                }
                return [200, {}];
            }
            catch (err) {
                console.error(err);
                return [500, {}];
            }
        });
        const lambdaFunction = require('./index');
        const resp = yield lambdaFunction.handler({
            RequestType: 'Update',
            StackId: 'stack-id',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
    test('Testing "Delete" Custom Resource Action', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda');
                }
                return [200, {}];
            }
            catch (err) {
                console.error(err);
                return [500, {}];
            }
        });
        const lambdaFunction = require('./index');
        const resp = yield lambdaFunction.handler({
            RequestType: 'Delete',
            StackId: 'stack-id',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
});
//# sourceMappingURL=index.spec.js.map