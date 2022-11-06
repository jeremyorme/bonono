function alphaPropSortFn(propName: string) {
    return (a, b) => +(a[propName] > b[propName]) || -(a[propName] < b[propName]);
}

export const byPublicKey = alphaPropSortFn('publicKey');
export const byClock = (a, b) => a.clock - b.clock;
