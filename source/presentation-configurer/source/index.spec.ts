// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('Presentation Configurer Lambda', () => {
    let axiosMock: any;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
        const emptySpy = sinon.spy((_, callback) => callback(null, {}));

        awsMock.mock('S3', 'putObject', emptySpy);
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
                SrcBucket: 'src-bucket',
                SrcPath: 'src-path',
                ManifestFile: 'manifest-file',
                DestBucket: 'dest-bucekt',
                ConsoleBucket: 'console-bucket',
                PrimaryRoutingLayerEndpoint: 'primary-routing-endpoint',
                PrimaryPhotosApiEndpoint: 'primary-photos-endpoint',
                PrimaryObjectStoreBucket: 'primary-object-store-bucket',
                PrimaryRegion: 'us-east-1',
                SecondaryRoutingLayerEndpoint: 'secondary-routing-endpoint',
                SecondaryPhotosApiEndpoint: 'secondary-photos-endpoint',
                SecondaryObjectStoreBucket: 'secondary-object-store-bucket',
                SecondaryRegion: 'us-east-2',
                IdentityPoolId: 'identity-pool-id',
                UserPoolClientId: 'client-id',
                UserPoolId: 'user-pool-id',
                UIRegion: 'us-west-2',
                AppId: 'app-id'
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