/**
 * Maps any axios error to a single friendly, displayable message.
 * Prefers the backend's own message (it's usually specific and correct);
 * falls back to a sensible status-code default, then a network-failure
 * message when there's no response at all (spec Part 4).
 */
const STATUS_MESSAGES = {
  400: "That request wasn't valid. Please check the form and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That already exists — please use a different value.",
  429: "Please wait a moment before sending another request.",
  500: "Something went wrong on our end. Please try again.",
  502: "We couldn't reach an external service. Please try again shortly.",
};

export const getErrorMessage = (error) => {
  if (!error) return STATUS_MESSAGES[500];

  const backendMessage = error.response?.data?.message;
  if (backendMessage) return backendMessage;

  const status = error.response?.status;
  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];

  if (error.code === "ECONNABORTED") {
    return "The request timed out. Please check your connection and try again.";
  }
  if (!error.response) {
    return "Can't reach the EduVerse server. Check that the backend is running and your connection is working, then try again.";
  }

  return STATUS_MESSAGES[500];
};

/** Extracts the field-level error list from a validation-style 400 response, if present. */
export const getFieldErrors = (error) => {
  const errors = error.response?.data?.errors;
  return Array.isArray(errors) ? errors : [];
};
