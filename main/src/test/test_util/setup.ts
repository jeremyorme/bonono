import crypto from "crypto";

Object.defineProperty(global, "crypto", {
    value: {
        subtle: crypto.webcrypto.subtle,
        getRandomValues: (arr: any) => crypto.randomBytes(arr.length)
    },
});
