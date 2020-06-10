// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('State Updater Lambda: Custom Resource Create', () => {
    let axiosMock: any;

    beforeEach(() => {
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));
        axiosMock = new MockAdapter(axios);
        process.env = Object.assign(process.env, { SEND_METRICS: 'Yes' });

        awsMock.mock('DynamoDB.DocumentClient', 'update', emptySpy);

        // Placeholder array to serve as the console manifest
        awsMock.mock('S3', 'getObject', { Body: JSON.stringify(['one', 'two']) });
    });

    afterEach(() => {
        awsMock.restore();
        sinon.restore();
    });

    test('Testing "Create" Custom Resource Action', async () => {
        // Set a 200 response for the Metrics event
        axiosMock.onPost().reply(200);

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

        const lambdaFunction = require('./state-updater');

        const resp = await lambdaFunction.handler({
            RequestType: 'Create',
            StackId: 'stack-id',
            ResourceProperties: {
                TableName: 'table-name',
                AppId: 'app-id',
                NewState: 'new-state'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});

describe('State Updater Lambda: Manual Invokation', () => {
    let axiosMock: any;

    beforeEach(() => {
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));
        axiosMock = new MockAdapter(axios);
        process.env = Object.assign(process.env, { SEND_METRICS: 'Yes' });

        awsMock.mock('DynamoDB.DocumentClient', 'update', emptySpy);

        // Placeholder array to serve as the console manifest
        awsMock.mock('S3', 'getObject', { Body: JSON.stringify(['one', 'two']) });
    });

    afterEach(() => {
        awsMock.restore();
        sinon.restore();
    });

    test('Valid event', async () => {
        // Set a 200 response for the Metrics event
        axiosMock.onPost().reply(200);

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

        const lambdaFunction = require('./state-updater');

        const resp = await lambdaFunction.handler({
            TableName: 'table-name',
            AppId: 'app-id',
            NewState: 'failover'
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp.statusCode).toBe(200);
    });

    test('Missing "TableName" value', async () => {
        const lambdaFunction = require('./state-updater');

        await lambdaFunction.handler({
            TableName: '',
            AppId: 'app-id',
            NewState: 'active'
        }, {}).catch(err => {
            expect(err.message).toEqual('TableName was not found in the event payload');
        });
    });

    test('Missing "AppId" value', async () => {
        const lambdaFunction = require('./state-updater');

        await lambdaFunction.handler({
            TableName: 'table-name',
            AppId: null,
            NewState: 'active'
        }, {}).catch(err => {
            expect(err.message).toEqual('AppId was not found in the event payload');
        });
    });

    test('Missing "NewState" value', async () => {
        const lambdaFunction = require('./state-updater');

        await lambdaFunction.handler({
            TableName: 'table-name',
            AppId: 'app-id',
            NewState: ''
        }, {}).catch(err => {
            expect(err.message).toEqual('NewState was not found in the event payload');
        });
    });

    test('Invalid "NewState" value', async () => {
        const lambdaFunction = require('./state-updater');
        const invalidState = 'foo-bar';

        await lambdaFunction.handler({
            TableName: 'table-name',
            AppId: 'app-id',
            NewState: invalidState
        }, {}).catch(err => {
            expect(err.message).toEqual(`${invalidState} is not a valid state. Accepted values are: [\"active\",\"fenced\",\"failover\"]`);
        });
    });
});

describe('State Updater Lambda - NOPs', () => {
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

        const lambdaFunction = require('./state-updater');

        const resp = await lambdaFunction.handler({
            RequestType: 'Update',
            StackId: 'stack-id',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
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

        const lambdaFunction = require('./state-updater');

        const resp = await lambdaFunction.handler({
            RequestType: 'Delete',
            StackId: 'stack-id',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});