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
const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
describe('UUIDGenerator', () => {
    let axiosMock;
    const uuidRE = /[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/;
    const bucketNameTokenRE = /[0-9a-fA-F]{12}/;
    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });
    test('Test Create', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda function');
                }
                if (!uuidRE.test(responseData.Data.SOLUTION_UUID)) {
                    throw new Error('SOLUTION_UUID was not a valid UUID');
                }
                if (!uuidRE.test(responseData.Data.APP_ID)) {
                    throw new Error('APP_ID was not a valid UUID');
                }
                if (!bucketNameTokenRE.test(responseData.Data.BUCKET_NAME_TOKEN)) {
                    throw new Error('BUCKET_NAME_TOKEN was not a valid UUID');
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
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
    test('Test Update', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda function');
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
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
    test('Test Delete', () => __awaiter(this, void 0, void 0, function* () {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);
                if (responseData.Status !== 'SUCCESS') {
                    throw new Error('Success status not returned from Custom Resource Lambda function');
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
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });
        expect(resp).toBe(200);
    }));
});
//# sourceMappingURL=index.spec.js.map