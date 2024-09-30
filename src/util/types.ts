// Placeholder type for unimplemented features or temporary typing.
export type TODO = any;

/**
 * Defines a tuple of a fixed length.
 *
 * @typeParam Length - The exact length of the tuple.
 * @typeParam TItem - The type of items in the tuple, defaults to number.
 */
export type Tuple<Length extends number, TItem> =
    [TItem, ...TItem[]] & { readonly length: Length }


export type Optional<T> = T | undefined