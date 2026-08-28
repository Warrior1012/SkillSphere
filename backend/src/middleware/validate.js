/** Usage: router.post('/register', validate(registerSchema), controller) */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = result.data;
  next();
};
