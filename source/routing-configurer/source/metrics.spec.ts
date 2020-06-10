// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
import { Metrics, IAnonymousMetricProperties } from './metrics';

describe('Metrics', () => {
    let axiosMock: any;

    beforeEach(() => {
        axiosMock = new MockAdapter(axios);
    });

    afterEach(() => {
        axiosMock.restore();
    });

    test('Sending Metric', async () => {
        // Force the metric POST event to succeed
        axiosMock.onPost().reply(200);

        const metricSpecificData = {
            TestNestedProperty: 'test-value'
        };

        const metricData: IAnonymousMetricProperties = {
            Solution: 'solution-id',
            UUID: 'solution-uuid',
            Version: 'version',
            Data: Object.assign({}, metricSpecificData)
        };

        // Send the metric
        const metrics = new Metrics();
        await metrics.sendAnonymousMetric(metricData);

        // Evaluate that the metric class constructed the metric request correctly
        const metricReq = axiosMock.history.post[0];
        expect(metricReq.url).toMatch('https://metrics.awssolutionsbuilder.com/generic');

        const timestampRegex = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]:[0-5][0-9].[0-9]/;
        const metricPayload = JSON.parse(metricReq.data);
        expect(metricPayload.Timestamp).toMatch(timestampRegex);
        expect(metricPayload.Solution).toMatch(metricData.Solution);
        expect(metricPayload.UUID).toMatch(metricData.UUID);
        expect(metricPayload.Version).toMatch(metricData.Version);
        expect(metricPayload.Data).toMatchObject(metricSpecificData);
    });
});