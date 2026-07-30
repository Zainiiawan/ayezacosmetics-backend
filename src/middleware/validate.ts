import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: ValidateTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    
    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      _res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }
    
    // Replace the request data with parsed (coerced) values
    req[target] = result.data;
    next();
  };
};
