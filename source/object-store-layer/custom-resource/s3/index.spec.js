// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const assert = require('chai').assert;
const AWS = require('aws-sdk-mock');
const index = require('./index');

describe('custom-resource', () => {
  afterEach(() => {
    AWS.restore('S3');
  });

  it('should create secondary bucket', async () => {
    AWS.mock('S3', 'createBucket', (_params, callback) => {
      callback(null, { Location: 'http://examplebucket.s3.amazonaws.com/' });
    });
    AWS.mock('S3', 'putBucketEncryption', (_params, callback) => {
      callback(null, {});
    });
    AWS.mock('S3', 'putBucketVersioning', (_params, callback) => {
      callback(null, {});
    });
    AWS.mock('S3', 'putBucketReplication', (_params, callback) => {
      callback(null, {});
    });
    AWS.mock('S3', 'putPublicAccessBlock', (_params, callback) => {
      callback(null, {});
    });

    const result = await index.createSecondaryBucket('us-east-1', 'us-east-2', 'primaryBucket', 'secondaryBucket', 'replicationRole')
    assert.deepEqual(result, {
        SecondaryBucket: 'secondaryBucket'
      });
  });
});
