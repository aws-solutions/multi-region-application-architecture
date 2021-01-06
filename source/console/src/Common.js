// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import { API } from 'aws-amplify';

export class Utils {
    /**
     * Returns the state (active/fenced/failover) of the application. Calls the primaryAppStateUrl first and uses secondaryAppStateUrl as a fallback
     */
    static async getAppState() {
        try {
            try {
                const response = await API.get('PrimaryAppState', '', {});
                if (!response || !response.state || response.state.trim() === ''){
                    throw new Error('Unable to retrieve a valid app state');
                }
                return response.state;
            } catch (err) {
                console.error(`Caught error while querying for the state in the primary region: ${err}`);
                const response = await API.get('SecondaryAppState', '', {});
                if (!response || !response.state || response.state.trim() === ''){
                    throw new Error('Unable to retrieve a valid app state');
                }
                return response.state;
            }
        } catch (err) {
            console.error(`Caught error while querying for the state in the secondary region: ${err}`);
            return null;
        }
    }
}

export default Utils;