import metadata from './build-info.json';
export const PRODUCT_NAME = metadata.name;
export const VERSION = metadata.version;
export const BUILD = metadata.build;
export const BUILD_LABEL = `Version ${VERSION} · Build ${BUILD}`;
