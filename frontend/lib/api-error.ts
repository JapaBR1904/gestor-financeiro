export class ApiError extends Error {
  constructor(mensagem: string, public readonly status: number) { super(mensagem); }
}
