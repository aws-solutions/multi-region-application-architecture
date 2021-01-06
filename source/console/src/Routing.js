// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * @author Solution Builders
 */

import React from 'react';
import Amplify from 'aws-amplify'

import App from './App'

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
            const getConfigResponse = await fetch('./uiConfig.json');
            const appConfig = await getConfigResponse.json();

            const amplifyConfig = {
                Auth: {
                    mandatorySignIn: true,
                    region: appConfig.uiRegion,
                    userPoolId: appConfig.userPoolId,
                    identityPoolId: appConfig.identityPoolId,
                    userPoolWebClientId: appConfig.userPoolClientId
                },
                Analytics: {
                    disabled: true
                },
                API: {
                    endpoints: [
                        {
                            name: 'PrimaryAppState',
                            endpoint: appConfig.primary.stateUrl,
                            region: appConfig.primary.region
                        },
                        {
                            name: 'SecondaryAppState',
                            endpoint: appConfig.secondary.stateUrl,
                            region: appConfig.secondary.region
                        }
                    ]
                }
            };

            Amplify.configure(amplifyConfig);

            this.setState({
                ready: true,
                region: appConfig.region,
                primaryAppStateUrl: appConfig.primary.stateUrl,
                secondaryAppStateUrl: appConfig.secondary.stateUrl,
                appConfig
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
            <App appConfig={this.state.appConfig} primaryAppStateUrl={this.state.primaryAppStateUrl} secondaryAppStateUrl={this.state.secondaryAppStateUrl} />
        )
    }
}

export default Routing
