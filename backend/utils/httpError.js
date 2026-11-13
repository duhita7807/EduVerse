/** Creates an Error carrying an HTTP status code, picked up by middleware/errorHandler. */
const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

module.exports = httpError;
