"use strict";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Metrics = void 0;
/**
 * @author Solution Builders
 */
const axios = require('axios');
const moment = require("moment");
/**
 * Sends anonymous metrics
 * @class Metrics
 */
class Metrics {
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
    sendAnonymousMetric(metricProperties) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const metricPayload = Object.assign({ TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S') }, metricProperties);
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
                yield axios(params);
            }
            catch (error) {
                // Only logging the error and throwing it up to avoid Metrics affecting the Application
                console.error(`Error occurred while sending metric: ${JSON.stringify(error)}`);
            }
        });
    }
}
exports.Metrics = Metrics;
//# sourceMappingURL=metrics.js.map