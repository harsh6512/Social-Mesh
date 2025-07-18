const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;

  if (value === undefined) {
    throw Error(`Missing String environment variable for ${key}`);
  }

  return value;
};

export const ENV = {
  PORT: getEnv("PORT"),
  DATABASE_URL: getEnv("DATABASE_URL"),

  CLOUDINARY_CLOUD_NAME: getEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: getEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: getEnv("CLOUDINARY_API_SECRET"),

  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL"),

  ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),
  ACCESS_TOKEN_EXPIRY: getEnv("ACCESS_TOKEN_EXPIRY"),
  REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),
  REFRESH_TOKEN_EXPIRY: getEnv("REFRESH_TOKEN_EXPIRY"),

  REDIS_HOST: getEnv("REDIS_HOST", "localhost"),
  REDIS_PORT: getEnv("REDIS_PORT", "6379"),

  REDIS_PASSWORD: getEnv("REDIS_PASSWORD", ""),
  EMAIL_USER: getEnv("EMAIL_USER"),
  EMAIL_PASS: getEnv("EMAIL_PASS"),
  FORGOTPASSWORD_TOKEN_SECRET: getEnv("FORGOTPASSWORD_TOKEN_SECRET"),
  FORGOTPASSWORD_TOKEN_EXPIRY: getEnv("FORGOTPASSWORD_TOKEN_EXPIRY"),

  FIREBASE_ADMIN_API:getEnv("FIREBASE_ADMIN_API")
};
