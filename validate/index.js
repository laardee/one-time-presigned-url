'use strict';

const AWS = require('aws-sdk');
const qs = require('querystring');
const crypto = require('crypto');

const { bucket } = require('../config.json');
const s3 = new AWS.S3({ region: 'us-east-1', signatureVersion: 'v4' });

const forbiddenResponse = {
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

const headSignature = async ({ type, signature }) => {
  const key = `signatures/${type}/${signature}`;
  try {
    await s3
      .headObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();
    return true;
  } catch (error) {
    return false;
  }
};

exports.handler = async event => {
  const { request } = event.Records[0].cf;
  const { querystring, uri, method } = request;
  const { 'X-Amz-Signature': signature } = qs.parse(querystring);

  if (method !== 'PUT') {
    return forbiddenResponse;
  }

  const params = {
    Bucket: bucket,
    Key: `signatures${uri}${signature}`,
  };

  const hash = crypto
    .createHash('sha256')
    .update(`${uri}?${querystring}`)
    .digest('hex');

  const [validSignature, expiredSignature] = await Promise.all([
    headSignature({ type: 'valid', signature: hash }),
    headSignature({ type: 'expired', signature: hash }),
  ]);

  if (!validSignature || expiredSignature) {
    return forbiddenResponse;
  }

  const { VersionId: version } = await s3
    .putObject({
      Bucket: bucket,
      Key: `signatures/expired/${hash}`,
      Body: JSON.stringify({ created: Date.now() }),
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    })
    .promise();

  const { Versions: versions } = await s3
    .listObjectVersions({
      Bucket: bucket,
      Prefix: `signatures/expired/${hash}`,
    })
    .promise();

  console.log({ version, versions });

  // if there are more that one version of the index file and current is not the first version
  if (versions.length > 1 && versions.reverse()[0].VersionId !== version) {
    return forbiddenResponse;
  }

  return request;
};
