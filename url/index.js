'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: 'us-east-1', signatureVersion: 'v4' });

const uuidv4 = require('uuid/v4');
const url = require('url');

const { bucket } = require('../config.json');

exports.handler = async event => {
  const { request } = event.Records[0].cf;
  const { headers } = request;

  const signedUrl = s3.getSignedUrl('putObject', {
    Bucket: bucket,
    Key: `uploads/${uuidv4()}`,
  });

  const { path } = url.parse(signedUrl);
  const host = headers.host[0].value;

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
