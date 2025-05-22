/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;