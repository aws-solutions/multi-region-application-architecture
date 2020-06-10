// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('StackSetResource Lambda: Custom Resource Create', () => {
    let axiosMock: any;

    beforeEach(() => {
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));
        axiosMock = new MockAdapter(axios);
        awsMock.mock('CloudFormation', 'createStackSet', emptySpy);
        awsMock.mock('CloudFormation', 'createStackInstances', emptySpy);
    });

    afterEach(() => {
        awsMock.restore();
        sinon.restore();
    });

    test('"Create" Custom Resource Action', async () => {
        axiosMock.onPut().reply((config: any) => {
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
            RequestType: 'Create',
            ResourceProperties: {
                StackSetName: 'stack-set-name',
                Accounts: ['123456789012'],
                Regions: ['region-1', 'region-2'],
                TemplateURL: 'template-url',
                AdministrationRoleARN: 'role-arn',
                ExecutionRoleName: 'role-name',
                Capabilities: ['cap-1', 'cap2'],
                Parameters: [
                    { key1: 'val1' }
                ],
                OperationPreferences: {
                    RegionOrder: ['region-1', 'region-2'],
                    FailureToleranceCount: 0,
                    MaxConcurrentCount: 1
                }
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});

describe('StackSetResource Lambda: Custom Resource Delete', () => {
    let axiosMock;

    beforeEach(() => {
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));
        axiosMock = new MockAdapter(axios);
        awsMock.mock('CloudFormation', 'deleteStackInstances', emptySpy);
        awsMock.mock('CloudFormation', 'deleteStackSet', emptySpy);
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
            ResourceProperties: {
                StackSetName: 'stack-set-name',
                Accounts: ['123456789012'],
                Regions: ['region-1', 'region-2']
            }
        }, { getRemainingTimeInMillis: () => { return 30000; } });

        expect(resp).toBe(200);
    });
});

describe('StackSetResource Lambda: Custom Resource Update', () => {
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