const { z } = require('zod');

function formatIssues(error) {
  if (!(error instanceof z.ZodError)) return [];
  return error.issues.map((issue) => ({
    field: Array.isArray(issue.path) ? issue.path.join('.') : '',
    message: issue.message,
  }));
}

function validateRequest({ body, query, params } = {}) {
  return async function requestValidationMiddleware(req, res, next) {
    try {
      if (body) req.body = await body.parseAsync(req.body);
      if (query) req.query = await query.parseAsync(req.query);
      if (params) req.params = await params.parseAsync(req.params);
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Donnees invalides.',
          error: 'Donnees invalides.',
          details: formatIssues(error),
        });
      }

      return next(error);
    }
  };
}

function validateBody(schema) {
  return validateRequest({ body: schema });
}

function validateQuery(schema) {
  return validateRequest({ query: schema });
}

function validateParams(schema) {
  return validateRequest({ params: schema });
}

module.exports = {
  validateRequest,
  validateBody,
  validateQuery,
  validateParams,
};
