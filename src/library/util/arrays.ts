export function mergeArrays<T>(arraysArray: T[][]): T[] {
    return [].concat.apply([], arraysArray);
}
