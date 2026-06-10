export class InvalidEffectiveMonthError extends Error {
  constructor() {
    super('Effective month is outside the recurring expense active period.')
  }
}
