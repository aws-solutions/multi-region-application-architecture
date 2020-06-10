// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import awsMock = require('aws-sdk-mock');
import axios = require('axios');
import sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('App Config WriterLambda: Custom Resource Create', () => {
    let axiosMock: any;

    const validEvent = {
        RequestType: 'Create',
        ResourceProperties: {
            PrimaryConsoleBucket: 'primary-console-bucket',
            SecondaryConsoleBucket: 'secondary-console-bucket',
            CurrentRegion: 'current-region',
            IdentityPoolId: 'identity-pool-id',
            KeyValueStoreTableName: 'kv-store-name',
            ObjectStoreBucketName: 'os-bucket-name',
            UserPoolClientId: 'up-client-id',
            UserPoolId: 'user-pool-id',
            AppApi: 'app-api'
        }
    };

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));

        awsMock.mock('S3', 'putObject', emptySpy);
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

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler(validEvent, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (CurrentRegion)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                CurrentRegion: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (IdentityPoolId)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                IdentityPoolId: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (KeyValueStoreTableName)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                KeyValueStoreTableName: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (ObjectStoreBucketName)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                ObjectStoreBucketName: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (UserPoolClientId)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                UserPoolClientId: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (UserPoolId)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                UserPoolId: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });

    test('Missing required resource property (AppApi)', async () => {
        axiosMock.onPut().reply((config: any) => {
            try {
                const responseData = JSON.parse(config.data);

                if (responseData.Status !== 'FAILED') { throw new Error('Failed status not returned from Custom Resource Lambda'); }

                return [200, {}];
            } catch (err) {
                console.error(err);
                return [500, {}];
            }
        });

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            ...validEvent,
            ResourceProperties: {
                ...validEvent.ResourceProperties,
                AppApi: ''
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});

describe('App Config WriterLambda - NOPs', () => {
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

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            RequestType: 'Update',
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

        const lambdaFunction = require('./app-config-writer');

        const resp = await lambdaFunction.handler({
            RequestType: 'Delete',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});