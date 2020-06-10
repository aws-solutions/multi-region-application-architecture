// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('Presentation Configurer Lambda', () => {
    let axiosMock: any;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));

        awsMock.mock('S3', 'createBucket', emptySpy);
        awsMock.mock('S3', 'headBucket', emptySpy);
        awsMock.mock('S3', 'putBucketAcl', emptySpy);
        awsMock.mock('S3', 'putBucketEncryption', emptySpy);
        awsMock.mock('S3', 'putPublicAccessBlock', emptySpy);
        awsMock.mock('S3', 'putBucketLogging', emptySpy);
        awsMock.mock('S3', 'copyObject', emptySpy);

        // Placeholder array to serve as the console manifest
        awsMock.mock('S3', 'getObject', { Body: JSON.stringify(['one', 'two']) });
    });

    afterEach(() => {
        awsMock.restore();
        sinon.restore();
    });

    test('Testing "Create" Custom Resource Action', async () => {
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
                FormattedStackName: 'test',
                PrimaryRegion: 'primary-region',
                SecondaryRegion: 'secondary-region',
                BucketNameToken: '123456789012',
                SrcBucket: 'src-bucket',
                SrcPath: 'src-path'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    })
});

describe('Presentation Configurer Lambda - NOPs', () => {
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

        const lambdaFunction = require('./index');

        const resp = await lambdaFunction.handler({
            RequestType: 'Delete',
            ResourceProperties: {}
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    });
});