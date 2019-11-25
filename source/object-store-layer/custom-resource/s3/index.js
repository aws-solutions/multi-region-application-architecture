// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0 

const AWS = require('aws-sdk'); 
 
const createSecondaryBucket = async (primaryRegion, secondaryRegion, primaryBucket, secondaryBucket, awsAccountNumber, replicationRole) => { 
 
  try { 
    let s3 = new AWS.S3({ region: secondaryRegion }) 
 
    let response = {} 
    console.log(`creating bucket ${secondaryBucket} in secondary region: ${secondaryRegion}`) 
    if (secondaryRegion === 'us-east-1') { 
        reponse = await s3.createBucket({ 
            Bucket: secondaryBucket, 
        }).promise() 
    } else { 
        response = await s3.createBucket({ 
            Bucket: secondaryBucket, 
            CreateBucketConfiguration: { 
                LocationConstraint: secondaryRegion 
            } 
        }).promise() 
    } 
    console.log(`created bucket with response: ${JSON.stringify(response)}`) 
 
    console.log(`putting encryption on bucket ${secondaryBucket} in secondary region: ${secondaryRegion}`) 
    response = await s3.putBucketEncryption({ 
      Bucket: secondaryBucket, 
      ServerSideEncryptionConfiguration: { 
        Rules: [ 
          { 
            ApplyServerSideEncryptionByDefault: { 
                SSEAlgorithm: 'aws:kms' 
            } 
          } 
        ] 
      } 
    }).promise() 
    console.log(`put encryption with response: ${JSON.stringify(response)}`) 
 
    console.log(`blocking public access on bucket ${secondaryBucket} in secondary region: ${secondaryRegion}`) 
    response = await s3.putPublicAccessBlock({ 
        Bucket: secondaryBucket, 
        PublicAccessBlockConfiguration: { 
            BlockPublicAcls: true, 
            BlockPublicPolicy: true, 
            IgnorePublicAcls: true, 
            RestrictPublicBuckets: true 
        } 
    }).promise() 
    console.log(`blocked public access with response: ${JSON.stringify(response)}`) 
 
    console.log(`setting versioning on bucket ${secondaryBucket} in secondary region: ${secondaryRegion}`) 
    response = await s3.putBucketVersioning({ 
      Bucket: secondaryBucket, 
      VersioningConfiguration: { 
        Status: 'Enabled' 
      } 
    }).promise() 
    console.log(`set bucket versioning with response: ${JSON.stringify(response)}`) 
 
    // give some time for bucket versioning to be applied before setting replication. 
    await waitForTimeout(10000) 
 
    // Reset S3 client to be in the primary region 
    s3 = new AWS.S3({ region: primaryRegion }) 
 
    console.log(`adding replication role from bucket ${primaryBucket} to bucket ${secondaryBucket}`) 
    await s3.putBucketReplication({ 
      Bucket: primaryBucket, 
      ReplicationConfiguration: { 
        Role: replicationRole, 
        Rules: [ 
          { 
            Destination: { 
              Bucket: `arn:aws:s3:::${secondaryBucket}`,
              EncryptionConfiguration: {
                ReplicaKmsKeyID: `arn:aws:kms:${secondaryRegion}:${awsAccountNumber}:alias/aws/s3`
              }
            }, 
            Prefix: '', 
            Status: 'Enabled',
            SourceSelectionCriteria: {
              SseKmsEncryptedObjects: {
                Status: 'Enabled'
              }
            }
          } 
        ] 
      } 
    }).promise(); 
 
    return { 
      SecondaryBucket: secondaryBucket 
    }; 
 
  } catch (error) { 
    console.log(error) 
    return Promise.reject(error); 
  } 
} 
 
function waitForTimeout(timeoutMillis) { 
  return new Promise(resolve => setTimeout(() => { 
      resolve({ 
          Status: 'FAILED', 
          Data: { Message: 'The Create request timed out' } 
      }) 
  }, timeoutMillis)) 
} 
 
module.exports = { 
  createSecondaryBucket 
} 