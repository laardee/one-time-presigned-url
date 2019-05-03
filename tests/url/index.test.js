'use strict';

const { handler } = require('../../url/index');

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
    expect(response).toEqual({
      status: '200',
      statusDescription: 'OK',
      headers: {
        'content-type': [{ key: 'Content-Type', value: 'text/plain' }],
        'content-encoding': [{ key: 'Content-Encoding', value: 'UTF-8' }],
      },
      body: 'https://temp.cloudfront.net/',
    });
  });
});
