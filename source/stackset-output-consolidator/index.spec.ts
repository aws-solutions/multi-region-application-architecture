// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

const awsMock = require('aws-sdk-mock');
const axios = require('axios');
const sinon = require('sinon');
const MockAdapter = require('axios-mock-adapter');

describe('StackSet Output Consolidator Lambda', () => {
    let axiosMock: any;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);

        awsMock.mock('CloudFormation', 'listStackInstances', {
            Summaries: [
                {
                    Region: 'us-east-1',
                    StackId: 'primary-stack-id'
                },
                {
                    Region: 'us-west-2',
                    StackId: 'secondary-stack-id'
                },
            ]
        });

        awsMock.mock('CloudFormation', 'describeStacks', {
            Stacks: [
                {
                    StackId: 'primary-stack-id',
                    Outputs: [
                        { OutputKey: 'RoutingLayerApiId', OutputValue: 'primaryRoutingLayerApiId' },
                        { OutputKey: 'PhotosApiId', OutputValue: 'primaryPhotosApiId' },
                        { OutputKey: 'ObjectStoreBucketName', OutputValue: 'primaryObjectStoreBucketName' }
                    ]
                },
                {
                    StackId: 'secondary-stack-id',
                    Outputs: [
                        { OutputKey: 'RoutingLayerApiId', OutputValue: 'secondaryRoutingLayerApiId' },
                        { OutputKey: 'PhotosApiId', OutputValue: 'secondaryPhotosApiId' },
                        { OutputKey: 'ObjectStoreBucketName', OutputValue: 'secondaryObjectStoreBucketName' }
                    ]
                }
            ]
        })
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

                const expectedResults = [
                    { Key: 'PrimaryRoutingLayerApiId', Value: 'primaryRoutingLayerApiId' },
                    { Key: 'PrimaryPhotosApiId', Value: 'primaryPhotosApiId' },
                    { Key: 'PrimaryObjectStoreBucket', Value: 'primaryObjectStoreBucketName' },
                    { Key: 'SecondaryRoutingLayerApiId', Value: 'secondaryRoutingLayerApiId' },
                    { Key: 'SecondaryPhotosApiId', Value: 'secondaryPhotosApiId' },
                    { Key: 'SecondaryObjectStoreBucket', Value: 'secondaryObjectStoreBucketName' }
                ];

                for (let i = 0; i < expectedResults.length; i++) {
                    const expectedResult = expectedResults[i];
                    if (!responseData.Data[expectedResult.Key] || responseData.Data[expectedResult.Key] !== expectedResult.Value) {
                        throw new Error(`Unexpected result for ${expectedResult.Key}`);
                    }
                }

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
                StackSetId: 'stack-set-id',
                PrimaryRegion: 'us-east-1',
                SecondaryRegion: 'us-west-2',
                AccountId: 'account-id'
            }
        }, { getRemainingTimeInMillis: () => { return 1000; } });

        expect(resp).toBe(200);
    })
});

describe('StackSet Output Consolidator Lambda - NOPs', () => {
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