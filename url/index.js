'use strict';

const AWS = require('aws-sdk');
const uuidv4 = require('uuid/v4');
const url = require('url');

const { bucket } = require('../config.json');
const s3 = new AWS.S3({ region: 'us-east-1', signatureVersion: 'v4' });
const crypto = require('crypto');

exports.handler = async event => {
  const { request } = event.Records[0].cf;
  const { headers } = request;

  const signedUrl = s3.getSignedUrl('putObject', {
    Bucket: bucket,
    Key: `uploads/${uuidv4()}`,
  });

  const { path } = url.parse(signedUrl);
  const host = headers.host[0].value;

  const hash = crypto
    .createHash('sha256')
    .update(path)
    .digest('hex');

  await s3
    .putObject({
      Bucket: bucket,
      Key: `signatures/valid/${hash}`,
      Body: JSON.stringify({ created: Date.now() }),
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    })
    .promise();

  const response = {
    status: '200',
    statusDescription: 'OK',
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
    body: `https://${host}${path}`,
  };
  return response;
};
