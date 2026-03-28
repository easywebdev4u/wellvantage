import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().uri().required(),
  APP_PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters',
  }),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().optional(),
  THROTTLE_TTL: Joi.number().optional(),
  THROTTLE_LIMIT: Joi.number().optional(),
});
