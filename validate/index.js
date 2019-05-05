'use strict';

const AWS = require('aws-sdk');
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

async function headSignature({ type, hash }) {
  const key = `signatures/${type}/${hash}`;
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
}

exports.handler = async event => {
  const { request } = event.Records[0].cf;
  const { querystring, uri, method } = request;

  if (method !== 'PUT') {
    return forbiddenResponse;
  }

  const hash = crypto
    .createHash('sha256')
    .update(`${uri}?${querystring}`)
    .digest('hex');

  const [validSignature, expiredSignature] = await Promise.all([
    headSignature({ type: 'valid', hash }),
    headSignature({ type: 'expired', hash }),
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

  const sortedVersions = versions.concat().sort((a, b) => {
    return a.LastModified > b.LastModified;
  });

  // if there are more that one version of the index file and current is not the initial version
  if (sortedVersions.length > 1 && sortedVersions[0].VersionId !== version) {
    return forbiddenResponse;
  }

  return request;
};
