/// <reference types="node" />
import { Module } from './module';
export declare class ModuleManager {
    static createClass(classname: string): Module;
    static registerClass(cl: new (instanceID: string) => Module, module: NodeModule): string;
}
