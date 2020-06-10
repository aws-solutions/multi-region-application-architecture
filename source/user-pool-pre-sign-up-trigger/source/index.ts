// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * This Lambda triggers off the Cognito Pre Sign-up event, which will be configured on the secondary region's user pool.
 * Since the intention is for the user pool in the secondary region to be read-only, we will deny new user
 * sign up requests by throwing an Error in this function.
 * 
 * @param event 
 */
export const handler = async (event: any) => {
    console.log(`Received event: ${JSON.stringify(event)}`);
    throw new Error('New user sign-ups are not allowed in the secondary region');
}