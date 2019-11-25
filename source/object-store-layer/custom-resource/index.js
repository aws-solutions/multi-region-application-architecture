// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
 
const s3 = require('./s3'); 
const cfn = require('./cfn'); 
const uuid = require('uuid') 
 
exports.handler = async (event, context) => { 
 
  console.log(JSON.stringify(event)) 
     
  const resource = event.ResourceProperties.Resource; 
  const config = event.ResourceProperties; 
  let responseData = {}; 
 
  try { 
    if (event.RequestType === 'Create') { 
 
      switch (resource) { 
 
        case ('CreateUuid'): 
 
          const id = uuid.v4() 
          responseData = { 
            UUID: `a-${id}`.toLowerCase() 
          }; 
          break; 
 
        case ('CreateSecondaryBucket'): 
          responseData = await s3.createSecondaryBucket(config.PrimaryRegion, config.SecondaryRegion,  
            config.PrimaryBucket, config.SecondaryBucket, config.AwsAccountNumber, config.ReplicationRole) 
          break; 
 
        default: 
          throw Error(resource + ' not defined as a resource'); 
        } 
      } 
      if (event.RequestType === 'Update') { 
          //Update not required for metrics 
      } 
       
      if (event.RequestType === 'Delete') { 
          //Delete not required for metrics 
      } 
       
      console.log(`responseData: ${responseData}`) 
      await cfn.send(event, context, 'SUCCESS', responseData, resource); 
       
  }  
  catch (error) { 
      console.log(error); 
      cfn.send(event, context, 'FAILED',{},resource); 
  } 
}; 