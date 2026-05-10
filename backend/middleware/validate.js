const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value && rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be a ${rules.type}`);
      }
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be less than ${rules.maxLength} characters`);
      }
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }
      if (value && rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }
    }
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    next();
  };
};

const sanitize = (req, res, next) => {
  const sanitizeValue = (val) => {
    if (typeof val !== 'string') return val;
    return val.replace(/[<>]/g, '').trim();
  };
  const sanitizeObj = (obj) => {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = sanitizeObj(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(sanitizeValue);
      } else {
        result[key] = sanitizeValue(value);
      }
    }
    return result;
  };
  if (req.body) req.body = sanitizeObj(req.body);
  if (req.query) req.query = sanitizeObj(req.query);
  next();
};

module.exports = { validate, sanitize };
