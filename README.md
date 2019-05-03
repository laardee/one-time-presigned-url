# Pre-signed upload to S3 with a one time token

- S3 Pre-Signed URL
- CloudFront
- Lambda@Edge

## Description

User fetches a pre-signed url from backend and uses that to upload data to S3 bucket. If bad guys get that pre-signed url, it can be used to again to upload a replacement. In this example the Lambda@Edge functions are used to generate to url and prevent multiple uploads.
