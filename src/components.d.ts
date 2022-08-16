/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { IDbClient } from "./library/db/db-client";
export namespace Components {
    interface BononoDb {
        /**
          * Server address
         */
        "address": string;
    }
}
export interface BononoDbCustomEvent<T> extends CustomEvent<T> {
    detail: T;
    target: HTMLBononoDbElement;
}
declare global {
    interface HTMLBononoDbElement extends Components.BononoDb, HTMLStencilElement {
    }
    var HTMLBononoDbElement: {
        prototype: HTMLBononoDbElement;
        new (): HTMLBononoDbElement;
    };
    interface HTMLElementTagNameMap {
        "bonono-db": HTMLBononoDbElement;
    }
}
declare namespace LocalJSX {
    interface BononoDb {
        /**
          * Server address
         */
        "address"?: string;
        /**
          * Produces DbClient
         */
        "onDbClient"?: (event: BononoDbCustomEvent<IDbClient>) => void;
    }
    interface IntrinsicElements {
        "bonono-db": BononoDb;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "bonono-db": LocalJSX.BononoDb & JSXBase.HTMLAttributes<HTMLBononoDbElement>;
        }
    }
}
