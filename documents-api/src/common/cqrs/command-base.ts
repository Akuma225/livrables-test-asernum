export abstract class CommandBase<T = any> {
    abstract readonly payload: T;
  }
  