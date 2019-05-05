'use strict';

const AWS = require('aws-sdk');

const { handler } = require('../../url/index');
const config = require('../../config.json');

let dateNowSpy;

jest.mock('uuid/v4', () => jest.fn().mockReturnValue('cafe-cafe-cafe-cafe'));

jest.mock('aws-sdk', () => {
  const mocks = {
    putObjectMock: jest.fn().mockResolvedValue({
      ETag: '"etaghash"',
      VersionId: 'mock.version.id',
    }),
    getSignedUrlMock: jest.fn((method, { Bucket, Key }) => {
      return `https://${Bucket}/${Key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIASCOBWLIAUR735SY4/20190505/us-east-1/s3/aws4_request&X-Amz-Date=20190505T064652Z&X-Amz-Expires=900&X-Amz-Security-Token=AgoJb3JpZ2luX2VjEP///////////wEaCWV1LXdlc3QtMiJHMEUCIQCzNWFf4SfM/CBTBIjNZkQMupxe1LeBcaYSd9YGJHnM+gIgE+kBy07ltmsCtnKqKw4JEKQgGHxWTjUG6cRyYRLWPAkqqAII6P//////////ARAAGgwxNDI2NzcwMDY4NDkiDIl/y39zPuhk+jeoYSr8Aep81cpi9m4VDQ3qGdftDFGFMYMF54TI1H2zh1Xmc4isMg9JgIaoOwq4ho5xdMGzHfmUsV2WGHfwDVR+Bm/UbayjGI8fEAgQwGD4OIH1R0cEr8bH7pRNjzlC6RANRWedxqWERQbj7kHZF3KSdckqA4zm2veoRHG3GdXuJ3GXJfmcLZSuAg66LZ+GPhEvsRSgDJYEXcRUwe8O2LnpdHehg0Fh/GwyBC6OZXaZNiaF2j8Oj1egkUgVfz4jhv4+xudRJlj1yn/zvEuNdYpcNvvvhQxKRcCTR5nwUF8VREFynEANUonBm+3S6Q6bZUGd6TEYZLKaGesD7ZOd9rhcGDDbjbrmBTq0AT1U90unFMB+B56/tgROVVp4k3UdkfZgr6QP5cy6IK1zeVkIvIQgODHYiQHF7jUEj6O9xRDqVNi39nXzi/1HJIyrc9uvw0mLq4zy/b5ycN3BjbqOnxemL/tyoBt9IUCDi/12G/52kVDzF989mzDsqgrwaOnh6udm17wLmtI7TTM03iOiKs1NuaNA2GIVZ+Y/380eNf91qRjrJtgZcUeTpSWHOUZzSEBtlZYEN/DmCl+TK0oeRg==&X-Amz-Signature=e82e13a268b861290d52d07878ea2980d58b41078d8ef28f894e61a152afd248&X-Amz-SignedHeaders=host`;
    }),
  };

  const S3 = {
    putObject: obj => ({
      promise: () => mocks.putObjectMock(obj),
    }),
    getSignedUrl: (...obj) => mocks.getSignedUrlMock(...obj),
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

describe('#url', () => {
  it('should allow access', async () => {
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
              querystring: '',
              uri: '/',
            },
          },
        },
      ],
    });
    expect(AWS.mocks.putObjectMock).toBeCalledTimes(1);
    expect(AWS.mocks.putObjectMock).toBeCalledWith({
      Body: '{"created":1556871773724}',
      Bucket: config.bucket,
      ContentEncoding: 'gzip',
      ContentType: 'application/json',
      Key: 'signatures/valid/7d2cb4d16ded97085a81a8e95bf1c78007a47af656586b3563d46183657e2d3b',
    });
    expect(response).toEqual({
      status: '200',
      statusDescription: 'OK',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'UTF-8' }],
      },
      body:
        'https://temp.cloudfront.net/uploads/cafe-cafe-cafe-cafe?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIASCOBWLIAUR735SY4/20190505/us-east-1/s3/aws4_request&X-Amz-Date=20190505T064652Z&X-Amz-Expires=900&X-Amz-Security-Token=AgoJb3JpZ2luX2VjEP///////////wEaCWV1LXdlc3QtMiJHMEUCIQCzNWFf4SfM/CBTBIjNZkQMupxe1LeBcaYSd9YGJHnM+gIgE+kBy07ltmsCtnKqKw4JEKQgGHxWTjUG6cRyYRLWPAkqqAII6P//////////ARAAGgwxNDI2NzcwMDY4NDkiDIl/y39zPuhk+jeoYSr8Aep81cpi9m4VDQ3qGdftDFGFMYMF54TI1H2zh1Xmc4isMg9JgIaoOwq4ho5xdMGzHfmUsV2WGHfwDVR+Bm/UbayjGI8fEAgQwGD4OIH1R0cEr8bH7pRNjzlC6RANRWedxqWERQbj7kHZF3KSdckqA4zm2veoRHG3GdXuJ3GXJfmcLZSuAg66LZ+GPhEvsRSgDJYEXcRUwe8O2LnpdHehg0Fh/GwyBC6OZXaZNiaF2j8Oj1egkUgVfz4jhv4+xudRJlj1yn/zvEuNdYpcNvvvhQxKRcCTR5nwUF8VREFynEANUonBm+3S6Q6bZUGd6TEYZLKaGesD7ZOd9rhcGDDbjbrmBTq0AT1U90unFMB+B56/tgROVVp4k3UdkfZgr6QP5cy6IK1zeVkIvIQgODHYiQHF7jUEj6O9xRDqVNi39nXzi/1HJIyrc9uvw0mLq4zy/b5ycN3BjbqOnxemL/tyoBt9IUCDi/12G/52kVDzF989mzDsqgrwaOnh6udm17wLmtI7TTM03iOiKs1NuaNA2GIVZ+Y/380eNf91qRjrJtgZcUeTpSWHOUZzSEBtlZYEN/DmCl+TK0oeRg==&X-Amz-Signature=e82e13a268b861290d52d07878ea2980d58b41078d8ef28f894e61a152afd248&X-Amz-SignedHeaders=host',
    });
  });
});
