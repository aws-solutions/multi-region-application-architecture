// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const axios = require('axios');
const moment = require('moment');

export const send = async (event: any) => {

  if (process.env.SendMetrics !== 'true') {
    return
  }

  try {
      const metric = {
        Solution: process.env.SolutionId,
        UUID: process.env.Uuid,
        Version: process.env.Version,
        TimeStamp: moment().utc().format('YYYY-MM-DD HH:mm:ss.S'),
        Data: event
      }
      const params = {
          method: 'post',
          port: 443,
          url: 'https://metrics.awssolutionsbuilder.com/generic',
          headers: {
              'Content-Type': 'application/json'
          },
          data: metric
      };

    const data = await axios(params);
    return data.status
  } catch (err) {
      console.log(err);
  }
} 