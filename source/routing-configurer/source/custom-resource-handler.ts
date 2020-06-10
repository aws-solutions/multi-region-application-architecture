// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Possible return values to the CloudFormation custom resource request.
 */
export enum StatusTypes {
  Success = 'SUCCESS',
  Failed = 'FAILED' 
}

/**
 * Returned from custom resource handler methods representing both the Status
 * and any corresponding data to include in the response.
 */
export interface CompletionStatus {
  Status: StatusTypes
  Data: any
}

/**
 * Any custom resource handler should implement this interface to leverage the 
 * shared custom resource handler implementation in this project.
 */
export interface ICustomResourceHandler {
  handle(): Promise<CompletionStatus>
}

/**
 * The request object coming from CloudFormation
 */
export interface ICustomResourceRequest {
  RequestType: string
  PhysicalResourceId: string
  StackId: string
  RequestId: string
  LogicalResourceId: string
  ResponseURL: string
  ResourceProperties: any
}

/**
 * Properties required for the front-end to connect to various
 * back-end resources
 */
export interface IAppConfig {
  identityPoolId: string
  userPoolClientId: string
  userPoolId: string
  keyValueStoreTableName: string
  objectStoreBucketName: string
  region: string
  photosApi: string
}

/**
 * Properties for the API Endpoint Writer, which will write a files to the Presentation Layer's S3 bucket
 * to store the API Endpoint URLs the front-end will use to get the current application state as well
 * as configuration properties for both the primary and secondary regions
 */
export interface IAppConfigWriterProperties {
  PrimaryConsoleBucket: string
  SecondaryConsoleBucket: string
  SecondaryRegion: string
  CurrentRegion: string
  ApiEndpointGetState: string
  AppId: string
  KeyValueStoreTableName: string
  ObjectStoreBucketName: string
  UserPoolId: string
  UserPoolClientId: string
  IdentityPoolId: string
  AppApi: string
}

/**
 * Properties for the State Writer
 */
export interface IStateUpdaterProperties {
  NewState: string
  TableName: string
  AppId: string
}
