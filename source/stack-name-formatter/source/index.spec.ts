// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
// const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('Stack Name Formatter Lambda : Custom Resource Create', () => {
    let axiosMock: any;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });

    test('Short Stack Name', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }
                if (responseData.Data.Value !== 'short') { throw new Error(`Stack name formatted incorrectly. Expected "short" and got "${responseData.Data.Value}"`); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                StackName: 'short'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Long Stack Name', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }
                if (responseData.Data.Value !== 'long-st') { throw new Error(`Stack name formatted incorrectly. Expected "long-st" and got "${responseData.Data.Value}"`); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                StackName: 'long-stack-name'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('7-character Stack Name', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }
                if (responseData.Data.Value !== 'abcdefg') { throw new Error(`Stack name formatted incorrectly. Expected "abcdefg" and got "${responseData.Data.Value}"`); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                StackName: 'abcdefg'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('8-character Stack Name', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }
                if (responseData.Data.Value !== 'abcdefg') { throw new Error(`Stack name formatted incorrectly. Expected "abcdefg" and got "${responseData.Data.Value}"`); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                StackName: 'abcdefgh'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Formatted Stack Name should be lowercase', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }
                if (responseData.Data.Value !== 'test-st') { throw new Error(`Stack name formatted incorrectly. Expected "test-st" and got "${responseData.Data.Value}"`); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            ResourceProperties: {
                StackName: 'Test-Stack-Name'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});

describe('Stack Name Formatter Lambda : Custom Resource Delete', () => {
    let axiosMock;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });

    test('Testing "Delete" Custom Resource Action', async () => {        
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        // Increase jest's timeout since we will be waiting 5 seconds
        // inside the lambda handler
        jest.setTimeout(10000);

        const lambdaFunction = require('./index');
        const resp = await lambdaFunction.handler({
            RequestType: 'Delete',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 30000; } });

        expect(resp).toBe(200);
    });
});

describe('Stack Name Formatter Lambda : Custom Resource Update', () => {
    let axiosMock;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });

    test('Testing "Update" Custom Resource Action', async () => {
        axiosMock.onPut().reply((config) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'SUCCESS') { throw new Error('Success status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Update',
            StackId: 'stack-id',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});