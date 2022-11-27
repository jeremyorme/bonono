function alphaPropSortFn(propName: string) {
    return (a, b) => +(a[propName] > b[propName]) || -(a[propName] < b[propName]);
}

export const byPublicKey = alphaPropSortFn('publicKey');
export const entryByClock = (a, b) => a.value._clock - b.value._clock;
