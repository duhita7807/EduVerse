import { useCallback, useState } from "react";

/**
 * Shared form-state + validation hook used across every form in the app
 * (Register, Login, EditProfile, Career Assistant topic input, etc).
 *
 * UX rule (spec): don't show an error before the user has interacted with
 * a field. So a field's error only renders once it's been `touched`
 * (blurred at least once, or the form was submitted) — see `visibleError`.
 *
 * @param {object} initialValues
 * @param {object} schema - { fieldName: (value, allValues) => errorMessage | "" }
 */
export const useFormValidation = (initialValues, schema = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validateField = useCallback(
    (name, value, allValues = values) => {
      const fn = schema[name];
      if (!fn) return "";
      return fn(value, allValues) || "";
    },
    [schema, values]
  );

  const handleChange = useCallback(
    (name, value) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value };
        // Re-validate live only once the field has already been touched,
        // so errors clear immediately as the user fixes them.
        if (touched[name]) {
          setErrors((prevErrors) => ({ ...prevErrors, [name]: validateField(name, value, next) }));
        }
        return next;
      });
    },
    [touched, validateField]
  );

  const handleBlur = useCallback(
    (name) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      setErrors((prev) => ({ ...prev, [name]: validateField(name, values[name], values) }));
    },
    [validateField, values]
  );

  /** Validates every field in the schema; returns true if the whole form is valid. */
  const validateAll = useCallback(() => {
    const nextErrors = {};
    const nextTouched = {};
    Object.keys(schema).forEach((name) => {
      nextTouched[name] = true;
      const msg = validateField(name, values[name], values);
      if (msg) nextErrors[name] = msg;
    });
    setTouched((prev) => ({ ...prev, ...nextTouched }));
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [schema, validateField, values]);

  const visibleError = (name) => (touched[name] ? errors[name] : "");

  const reset = useCallback((next = initialValues) => {
    setValues(next);
    setErrors({});
    setTouched({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { values, setValues, errors, touched, handleChange, handleBlur, validateAll, visibleError, reset };
};
