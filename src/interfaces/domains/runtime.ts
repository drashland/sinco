export namespace Runtime {
  export interface evaluate {
    result: {
      type: string, // the `typeof value`, always "boolean"
      value: boolean
    }
  }
}