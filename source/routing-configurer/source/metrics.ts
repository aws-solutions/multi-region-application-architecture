// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const axios = require('axios');
import * as moment from 'moment';

/**
 * Properties required for a valid anonymous metric payload
 */
export interface IAnonymousMetricProperties {
    Solution: string
    UUID: string
    Version: string
    Data: any
}

/**
 * Sends anonymous metrics
 * @class Metrics
 */
export class Metrics {
    // Metric endpoint
    endpoint: string;

    /**
     * @constructor
     */
    constructor() {
        this.endpoint = 'https://metrics.awssolutionsbuilder.com/generic';
    }

    /**
     * Sends anonymous metric
     * @param {IAnonymousMetricProperties} metricProperties - Properties to be sent in the anonymous metric payload
     */
    async sendAnonymousMetric(metricProperties: IAnonymousMetricProperties): Promise<void> {
        try {
            const metricPayload = Object.assign({ Timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S') }, metricProperties);
            const params = {
                method: 'post',
                port: 443,
                url: this.endpoint,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: metricPayload
            };

            console.log(`Sending anonymous metric: ${JSON.stringify(metricPayload)}`);
            await axios(params);
        } catch (error) {
            // Only logging the error and throwing it up to avoid Metrics affecting the Application
            console.error(`Error occurred while sending metric: ${JSON.stringify(error)}`);
        }
    }
}