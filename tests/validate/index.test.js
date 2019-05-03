'use strict';

const AWS = require('aws-sdk');
const { handler } = require('../../validate/index');

let dateNowSpy;

jest.mock('aws-sdk', () => {
  const mocks = {
    putObjectMock: jest.fn(),
    headObjectMock: jest.fn(),
  };

  const S3 = {
    putObject: obj => ({
      promise: () => mocks.putObjectMock(obj),
    }),
    headObject: obj => ({
      promise: () => mocks.headObjectMock(obj),
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
    AWS.mocks.headObjectMock = jest.fn().mockRejectedValueOnce('error');
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
      Key: 'signatures/db1fa5f6-e2ab-4447-9511-2b8093e388cf/mock-signature',
    });
    expect(AWS.mocks.putObjectMock).toBeCalledWith({
      Body: '{"created":1556871773724}',
      Bucket: 'temp-bucketname-maas',
      ContentEncoding: 'gzip',
      ContentType: 'application/json',
      Key: 'signatures/db1fa5f6-e2ab-4447-9511-2b8093e388cf/mock-signature',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledTimes(1);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(1);
    expect(response).toEqual({
      headers: { host: [{ key: 'Host', value: 'temp.cloudfront.net' }] },
      method: 'PUT',
      querystring:
        'X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=mock-credentials&X-Amz-Date=20190502T194435Z&X-Amz-Expires=900&X-Amz-Security-Token=mock-security-token&X-Amz-Signature=mock-signature&X-Amz-SignedHeaders=host',
      uri: '/db1fa5f6-e2ab-4447-9511-2b8093e388cf',
    });
  });

  it('should allow access', async () => {
    AWS.mocks.headObjectMock = jest.fn().mockResolvedValueOnce('ok');
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
      Key: 'signatures/db1fa5f6-e2ab-4447-9511-2b8093e388cf/mock-signature',
    });
    expect(AWS.mocks.headObjectMock).toBeCalledTimes(1);
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(0);
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
