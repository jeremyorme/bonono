function alphaPropSortFn(propGetter: (o: any) => string) {
    return (a, b) => +(propGetter(a) > propGetter(b)) || -(propGetter(a) < propGetter(b));
}

export const byPublicKey = alphaPropSortFn((o: any) => o?.publicKey);
export const byUpdatedPublicKey = alphaPropSortFn((o: any) => o?.updated?.publicKey);
export const entryByClock = (a, b) => a._clock - b._clock;
