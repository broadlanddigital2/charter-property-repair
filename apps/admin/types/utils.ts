export type Negatives = null | undefined;

export type Primitives =
  | number
  | string
  | boolean
  | bigint
  | undefined
  | symbol;

export type Nullable<T> = T | Negatives;

export type NullableType = Nullable<never>;
