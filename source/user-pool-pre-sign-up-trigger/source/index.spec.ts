// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

describe('User Pool Pre Sign-Up Trigger Lambda', () => {
    test('Testing invokation of the function. Expecting an Error', async () => {
        const lambdaFunction = require('./index');

        try {
            await lambdaFunction.handler({});
        } catch (e) {
            expect(e.message).toBe('New user sign-ups are not allowed in the secondary region');
        }
    });
});