# Pre-signed upload to S3 with a one time token

See [Expiring Presigned S3 URL on Initial Upload @ Medium](https://medium.com)

## Setup

Edit the config.json file and change the name of the bucket, rename the project by editing the service name in serverless.yml

## Deployment

Use Serverless Framework for deployment. Install the dependecies with `npm install` and then run `sls deploy` in the project root to start the deployment.
