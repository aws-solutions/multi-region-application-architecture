// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');
AWS.config.logger = console;

/**
 * Copy Console assets from source to destination buckets
 */
const copyAssets = async (srcBucket, srcPath, manifestFile, destBucket) => {

	const s3 = new AWS.S3();

	try {
		// get file manifest from s3
		const params = {
			Bucket: srcBucket,
			Key:`${srcPath}/${manifestFile}`
		};

		const data = await s3.getObject(params).promise();
		const manifest = JSON.parse(data.Body);
		console.log('Manifest:', JSON.stringify(manifest,null,2));

		// Loop through manifest and copy files to the destination bucket
		await Promise.all(manifest.map(async (file) => {
			let params = {
				Bucket: destBucket,
				CopySource: `${srcBucket}/${srcPath}/${file}`,
				Key: file
			};
			const resp = await s3.copyObject(params).promise();
			console.log('file copied to s3: ', resp);
		}));

	} catch (err) {
		throw err;
	}
	return 'success';
};


/**
 * generate the amplify config file.
 */
const configFile = async (file, destBucket) => {

	const s3 = new AWS.S3();

	try {
		//write exports file to the console
		const params = {
			Bucket: destBucket,
			Key:'console/assets/amplifyConfig.js',
			Body: file
		};
		console.log(`creating config file: ${JSON.stringify(params)}`);
		await s3.putObject(params).promise();
	} catch (err) {
		throw err;
	}
	return 'success';
};

/**
 * update an s3 bucket with a cors configuration for access from cloudfront
 */
const putBucketCors = async (bucket, cfDomain) => {

	const s3 = new AWS.S3();

	try {
		const params = {
			Bucket: bucket,
			CORSConfiguration: {
				CORSRules: [
					{
						AllowedMethods: [
						'GET',
						'POST',
						'PUT',
						'DELETE',
						],
						AllowedOrigins: [
						`http://${cfDomain}`,
						`https://${cfDomain}`
						],
						AllowedHeaders: ['*']
					}
				]
			}
		};
		console.log(`updating S3 Cors config:: ${JSON.stringify(params)}`);
		await s3.putBucketCors(params).promise();
	} catch (err) {
		throw err;
	}
	return 'success';
};

module.exports = {
	copyAssets: copyAssets,
	configFile: configFile,
	putBucketCors: putBucketCors
};
