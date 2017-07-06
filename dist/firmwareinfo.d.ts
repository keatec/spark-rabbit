/// <reference types="node" />
export declare class FirmwareInfo {
    static identify(appHash: string): any;
    static getFileBuffer(name: string): Promise<Buffer>;
}
