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

import React from 'react';
import Amplify from 'aws-amplify'

import App from './App'
import Utils from './Common';

class Routing extends React.Component {

    constructor(props) {
        super(props)

        this.state = {
            ready: false,
            region: ''
        }
    }

    async getPropertyFromEndpoint(endpointUrl, propertyKey) {
        const resp = await fetch(endpointUrl);
        const respJson = await resp.json();
        return respJson[propertyKey];
    }

    async componentDidMount() {
        try {
            let appConfig = {};

            // Retrieve the endpoint URLs to query for the application's state
            const primaryAppStateUrl = await this.getPropertyFromEndpoint('./primaryApiEndpoint.json', 'state');
            const secondaryAppStateUrl = await this.getPropertyFromEndpoint('./secondaryApiEndpoint.json', 'state');

            // Retrieve the state of the application
            const currentState = await Utils.getAppState(primaryAppStateUrl, secondaryAppStateUrl);

            if (!currentState || (currentState !== 'active' && currentState !== 'fenced' && currentState !== 'failover')) {
                throw new Error('Unable to determine the current state of the application');
            }

            let getConfigResponse = await fetch(currentState === 'failover' ? './secondaryAppConfig.json' : './primaryAppConfig.json');
            Object.assign(appConfig, await getConfigResponse.json());

            const amplifyConfig = {
                Auth: {
                    mandatorySignIn: true,
                    region: appConfig.region,
                    userPoolId: appConfig.userPoolId,
                    identityPoolId: appConfig.identityPoolId,
                    userPoolWebClientId: appConfig.userPoolClientId
                },
                Analytics: {
                    disabled: true
                },
                Storage: {
                    AWSS3: {
                        bucket: appConfig.objectStoreBucketName,
                        region: appConfig.region,
                        identityPoolId: appConfig.identityPoolId,
                    },
                    level: 'public'
                },
                API: {
                    endpoints: [
                        {
                            name: 'PhotosApi',
                            endpoint: appConfig.photosApi
                        }
                    ]
                }
            };

            Amplify.configure(amplifyConfig);

            this.setState({
                ready: true,
                region: appConfig.region,
                primaryAppStateUrl: primaryAppStateUrl,
                secondaryAppStateUrl: secondaryAppStateUrl,
                isSecondaryRegion: (currentState === 'failover')
            });
        } catch (err) {
            console.error(err);
        }
    }

    render() {
        if (!this.state.ready) {
            return <div />
        }

        return (
            <App region={this.state.region} primaryAppStateUrl={this.state.primaryAppStateUrl} secondaryAppStateUrl={this.state.secondaryAppStateUrl} isSecondaryRegion={this.state.isSecondaryRegion} />
        )
    }
}


export default Routing
