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
  Props: IResourceProperties
}

/**
 * The properties specified in the CloudFormation custom resource and mapped to 
 * the CloudFormation CreateStackSet API call.
 */
export interface IResourceProperties {
  StackSetName: string
  Accounts: string[]
  Regions: string[]
  TemplateURL: string
  AdministrationRoleARN: string
  ExecutionRoleName: string
  Capabilities: string[]
  Parameters: string[]
  OperationPreferences: IOperationPreferences
}

/**
 * The properties specified in the CloudFormation custom resource and mapped to
 * the CloudFormation CreateStackInstances API call.
 */
export interface IOperationPreferences {
  RegionOrder: string[]
  FailureToleranceCount: number
  MaxConcurrentCount: number
}