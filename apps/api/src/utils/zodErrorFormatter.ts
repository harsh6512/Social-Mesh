export const formatZodErrors = (
  formattedErrors: Record<string, { _errors: string[] }>
): { field: string; message: string }[] => {
  return Object.entries(formattedErrors)
    .filter(([key]) => key !== "_errors")
    .map(([field, issue]) => ({
      field,
      message: issue._errors.join(", ")
    }));
};
