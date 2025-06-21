import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI,
  // host: process.env.DB_HOST || 'localhost',
  // port: parseInt(process.env.DB_PORT || '27017', 10),
  // username: process.env.DB_USERNAME,
  // password: process.env.DB_PASSWORD,
  // database: process.env.DB_NAME,
}));
