'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: 'us-east-1', signatureVersion: 'v4' });

const qs = require('querystring');

const { bucket } = require('../config.json');

exports.handler = async event => {
  const { request } = event.Records[0].cf;
  const { querystring, uri } = request;
  const { 'X-Amz-Signature': signature } = qs.parse(querystring);

  const params = {
    Bucket: bucket,
    Key: `signatures${uri}/${signature}`,
  };

  try {
    await s3.headObject(params).promise();
    return {
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [
          {
            key: 'Content-Type',
            value: 'text/plain',
          },
        ],
        'content-encoding': [
          {
            key: 'Content-Encoding',
            value: 'UTF-8',
          },
        ],
      },
      body: 'Forbidden',
    };
  } catch (error) {
    //
  }

  await s3
    .putObject(
      Object.assign({}, params, {
        Body: JSON.stringify({ created: Date.now() }),
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
      })
    )
    .promise();

  return request;
};
