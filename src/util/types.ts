// Placeholder type for unimplemented features or temporary typing.
export type TODO = any;

/**
 * Defines a tuple of a fixed length.
 *
 * @typeParam Length - The exact length of the tuple.
 * @typeParam T - The type of items in the tuple, defaults to number.
 */
export type Tup<Len extends number, T extends any = number, R extends any[] = []> = 
  R['length'] extends Len ? R : Tup<Len, T, [T, ...R]>;



export type Optional<T> = T | undefined