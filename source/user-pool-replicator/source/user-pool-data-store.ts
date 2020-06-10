// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Abstract Data Store for Cognito User Pool user information
 * 
 * NOTE - This may also need some type of blob type to hold other, non-required attributes that a user pool has on it
 */
export interface IUser {
  userName: string,
  userId: string,
  importState: string,
  attributes: any
}

export interface IUserPoolDataStore {
  hasUser(userId: string): Promise<boolean>
  createOrUpdateUser(user: IUser): Promise<void>
  deleteUser(userId: string): Promise<void>
}