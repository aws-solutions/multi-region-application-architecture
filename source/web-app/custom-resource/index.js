// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

 const cfn = require('./cfn');
 const s3 = require('./s3');

 exports.handler = async (event, context) => {

     console.log(`event: ${JSON.stringify(event,null,2)}`);

     const resource = event.ResourceProperties.Resource;
     const config = event.ResourceProperties;
     let responseData = {};

     try {
         if (event.RequestType === 'Create') {

             switch (resource) {
                 case ('CopyConsoleFiles'):
                     await s3.copyAssets(config.SrcBucket, config.SrcPath, config.ManifestFile, config.DestBucket);
                     break;

                 case ('CreateAmplifyConfig'):
                     await s3.configFile(config.AmplifyConfig, config.DestBucket);
                     break;
                 case ('S3CorsConfig'):
                     await s3.putBucketCors(config.Bucket, config.CloudFrontDomain);
                     break;
             }
         }
         if (event.RequestType === 'Update') {
             //Update not required
         }

         if (event.RequestType === 'Delete') {
             //Delete not required
         }

         await cfn.send(event, context, 'SUCCESS', responseData, resource);

     }
     catch (err) {
         console.log(err, err.stack);
         cfn.send(event, context, 'FAILED',{},resource);
     }
 };
