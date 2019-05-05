'use strict';

const AWS = require('aws-sdk');
const { handler } = require('../../validate/index');

let dateNowSpy;

jest.mock('aws-sdk', () => {
  const mocks = {
    putObjectMock: jest.fn().mockResolvedValue({
      ETag: '"etaghash"',
      VersionId: 'mock.version.id',
    }),
    headObjectMock: jest.fn(),
    listObjectVersionsMock: jest.fn().mockResolvedValue({
      Versions: [
        {
          LastModified: 'fa',
          IsLatest: true,
          VersionId: 'mock.version.id',
        },
      ],
    }),
  };

  const S3 = {
    putObject: obj => ({
      promise: () => mocks.putObjectMock(obj),
    }),
    headObject: obj => ({
      promise: () => mocks.headObjectMock(obj),
    }),
    listObjectVersions: obj => ({
      promise: () => mocks.listObjectVersionsMock(obj),
    }),
  };

  return {
    mocks,
    S3: jest.fn().mockImplementation(() => S3),
  };
});

beforeAll(() => {
  dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 1556871773724);
});

afterEach(() => {
  Object.values(AWS.mocks).forEach(mock => mock.mockClear());
});

afterAll(() => {
  jest.restoreAllMocks();
  dateNowSpy.mockRestore();
});

describe('#validate', () => {
  it('should allow access', async () => {
    AWS.mocks.headObjectMock = jest.fn(({ Bucket, Key }) => {
      if (/signatures\/valid/.test(Key)) {
        return Promise.resolve();
      } else if (/signatures\/expired/.test(Key)) {
        return Promise.reject(new Error());
      }
    });
    const response = await handler({
      Records: [
        {
          cf: {
            request: {
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'temp.cloudfront.net',
                  },
                ],
              },
              method: 'PUT',
              querystring:
                'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
              uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
            },
          },
        },
      ],
    });
    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/valid/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/expired/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.putObjectMock).toBeCalledWith({
      Body: '{"created":1556871773724}',
      Bucket: 'temp-bucketname-maas',
      ContentEncoding: 'gzip',
      ContentType: 'application/json',
      Key: 'signatures/expired/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledTimes(2);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(1);
    expect(AWS.mocks.listObjectVersionsMock).toBeCalledTimes(1);
    expect(response).toEqual({
      headers: { host: [{ key: 'Host', value: 'temp.cloudfront.net' }] },
      method: 'PUT',
      querystring:
        'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
      uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
    });
  });

  it('should deny access if item already exists', async () => {
    AWS.mocks.headObjectMock = jest.fn(({ Bucket, Key }) => {
      if (/signatures\/valid/.test(Key)) {
        return Promise.resolve();
      } else if (/signatures\/expired/.test(Key)) {
        return Promise.resolve();
      }
    });
    const response = await handler({
      Records: [
        {
          cf: {
            request: {
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'temp.cloudfront.net',
                  },
                ],
              },
              method: 'PUT',
              querystring:
                'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
              uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
            },
          },
        },
      ],
    });

    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/valid/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/expired/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledTimes(2);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(0);
    expect(AWS.mocks.listObjectVersionsMock).toBeCalledTimes(0);
    expect(response).toEqual({
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'UTF-8' }],
      },
      body: 'Forbidden',
    });
  });

  it('should deny access if not the first version', async () => {
    AWS.mocks.headObjectMock = jest.fn(({ Bucket, Key }) => {
      if (/signatures\/valid/.test(Key)) {
        return Promise.resolve();
      } else if (/signatures\/expired/.test(Key)) {
        return Promise.reject(new Error());
      }
    });
    AWS.mocks.listObjectVersionsMock = jest.fn().mockResolvedValueOnce({
      Versions: [
        {
          LastModified: '2019-05-05T19:57:27.000Z',
          IsLatest: false,
          VersionId: 'mock.initial-version.id',
        },
        {
          LastModified: '2019-05-05T19:59:27.000Z',
          IsLatest: true,
          VersionId: 'mock.version.id',
        }
      ],
    });
    const response = await handler({
      Records: [
        {
          cf: {
            request: {
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'temp.cloudfront.net',
                  },
                ],
              },
              method: 'PUT',
              querystring:
                'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
              uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
            },
          },
        },
      ],
    });

    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/valid/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledWith({
      Bucket: 'temp-bucketname-maas',
      Key: 'signatures/expired/fa506f4395964d0e7d68eca652805ffa08a27613aee67fc7f27190f1dd0f9401',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledTimes(2);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(1);
    expect(AWS.mocks.listObjectVersionsMock).toBeCalledTimes(1);
    expect(response).toEqual({
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'UTF-8' }],
      },
      body: 'Forbidden',
    });
  });

  it('should deny access if not PUT method is used', async () => {
    AWS.mocks.headObjectMock = jest.fn(({ Bucket, Key }) => {
      if (/signatures\/valid/.test(Key)) {
        return Promise.resolve();
      } else if (/signatures\/expired/.test(Key)) {
        return Promise.reject(new Error());
      }
    });
    AWS.mocks.listObjectVersionsMock = jest.fn().mockResolvedValueOnce({
      Versions: [
        {
          LastModified: 'fa',
          IsLatest: true,
          VersionId: 'mock.version.id',
        },
      ],
    });
    const response = await handler({
      Records: [
        {
          cf: {
            request: {
              headers: {
                host: [
                  {
                    key: 'Host',
                    value: 'temp.cloudfront.net',
                  },
                ],
              },
              method: 'GET',
              querystring:
                'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
              uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
            },
          },
        },
      ],
    });

    expect(AWS.mocks.headObjectMock).toBeCalledTimes(0);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(0);
    expect(AWS.mocks.listObjectVersionsMock).toBeCalledTimes(0);
    expect(response).toEqual({
      status: '403',
      statusDescription: 'Forbidden',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'UTF-8' }],
      },
      body: 'Forbidden',
    });
  });
});
