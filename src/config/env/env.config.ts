import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY,
    publicKey: process.env.JWT_PUBLIC_KEY,
  },
  mail: {
    from: process.env.EMAIL_FROM,
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
    },
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucketName: process.env.AWS_S3_BUCKET_NAME,
    },
    cloudfront: {
      domain: process.env.AWS_CLOUDFRONT_DOMAIN,
      keyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.AWS_CLOUDFRONT_PRIVATE_KEY,
      signedUrlExpiry: parseInt(process.env.AWS_CLOUDFRONT_SIGNED_URL_EXPIRY || '86400', 10),
    },
  }
}));
