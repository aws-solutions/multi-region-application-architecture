/*******************************************************************************
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved. 
 *
 * Licensed under the Amazon Software License (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0    
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 *
 ********************************************************************************/

 export class Utils {
    /**
     * Returns the state (active/fenced/failover) of the application. Calls the primaryAppStateUrl first and uses secondaryAppStateUrl as a fallback
     * @param {*} primaryAppStateUrl 
     * @param {*} secondaryAppStateUrl 
     */
    static async getAppState(primaryAppStateUrl, secondaryAppStateUrl) {
        try {
            try {
                let primaryResponse = await fetch(primaryAppStateUrl);
                let primaryJson = await primaryResponse.json();
                return primaryJson.state;
            } catch (err) {
                console.error(`Caught error while querying for the state in the primary region: ${err}`);

                let secondaryResponse = await fetch(secondaryAppStateUrl);
                let secondaryJson = await secondaryResponse.json();
                return secondaryJson.state;
            }
        } catch (err) {
            console.error(`Caught error while querying for the state in the secondary region: ${err}`);
            return null;
        }
    }
}

export default Utils;