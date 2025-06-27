import { registerAs } from '@nestjs/config';

export default registerAs('env', () => ({
  node_env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8000', 10),
  frontendUrl: process.env.FRONTEND_URL,
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
      staticCdnUrl: process.env.AWS_S3_STATIC_CDN_URL,
    },
    cloudfront: {
      domain: process.env.AWS_CLOUDFRONT_DOMAIN,
      keyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.AWS_CLOUDFRONT_PRIVATE_KEY,
      signedUrlExpiry: parseInt(process.env.AWS_CLOUDFRONT_SIGNED_URL_EXPIRY || '86400', 10),
    },
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    orgId: process.env.OPENAI_ORG_ID,
    model: process.env.OPENAI_MODEL,
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '10', 10),
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES || '2', 10),
    dailyLimit: parseInt(process.env.BUDDY_DAILY_LIMIT || '100', 10),
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publicKey: process.env.STRIPE_PUBLIC_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    monthlySubscriptionPriceId: process.env.STRIPE_MONTHLY_SUBSCRIPTION_PRICE_ID,
    yearlySubscriptionPriceId: process.env.STRIPE_YEARLY_SUBSCRIPTION_PRICE_ID,
  },
}));
