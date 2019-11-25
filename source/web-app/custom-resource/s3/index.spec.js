// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const assert = require('chai').assert;
const expect = require('chai').expect;
const path = require('path');

let AWS = require('aws-sdk-mock');
AWS.setSDK(path.resolve('./node_modules/aws-sdk'));

const lambda = require('./index.js');

describe('#S3::', () => {

	afterEach(() => {
    AWS.restore('S3');
	});


  it('should return "success" on CopyConsoleFiles sucess', async () => {

    let data = {Body:"[\"console/file1\",\"console/file2\"]"};
    let resp = {};

    AWS.mock('S3', 'getObject', Promise.resolve(data));
    AWS.mock('S3', 'copyObject', Promise.resolve(resp));

    let response = await lambda.copyAssets('srcBucket', 'srcPath', 'manifestFile', 'destBucket')
    expect(response).to.equal('success');
	});

  it('should return "ERROR" on CopyConsoleFiles failure', async () => {

    AWS.mock('S3', 'getObject', Promise.reject('ERROR'));

    await lambda.copyAssets('srcBucket', 'srcPath', 'manifestFile', 'destBucket').catch(err => {
      expect(err).to.equal('ERROR');
    });
  });

  it('should return "success" on CreateAmplifyConfig sucess', async () => {

    let file = "configfile";

    AWS.mock('S3', 'putObject', Promise.resolve());

    let response = await lambda.configFile('file', 'destBucket')
    expect(response).to.equal('success');
	});

  it('should return "ERROR" on CreateAmplifyConfig failure', async () => {

    AWS.mock('S3', 'putObject', Promise.reject('ERROR'));

    await lambda.configFile('file', 'destBucket').catch(err => {
      expect(err).to.equal('ERROR');
    });
  });

  it('should return "success" on S3CorsConfig sucess', async () => {


    AWS.mock('S3', 'putBucketCors', Promise.resolve());

    let response = await lambda.putBucketCors('bucket', 'cfDomain')
    expect(response).to.equal('success');
	});

  it('should return "ERROR" on S3CorsConfig failure', async () => {

    AWS.mock('S3', 'putBucketCors', Promise.reject('ERROR'));

    await lambda.putBucketCors('bucket', 'domain').catch(err => {
      expect(err).to.equal('ERROR');
    });
  });

});
