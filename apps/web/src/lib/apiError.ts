export class ApiError<T = null> extends Error {
  statusCode: number;
  data: T | null;
  success: boolean;
  errors: { field: string; message: string }[];

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: { field: string; message: string }[] = [],
    data: T | null = null
  ) {
    super(message);

    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = false;
    this.errors = errors;
  }
}