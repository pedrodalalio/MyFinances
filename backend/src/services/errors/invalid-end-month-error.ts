export class InvalidEndMonthError extends Error {
  constructor() {
    super('End month cannot be before the start of the recurring expense.')
  }
}
