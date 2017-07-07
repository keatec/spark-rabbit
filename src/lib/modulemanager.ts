
import { Module } from './module';
import path = require('path');

const runtime: Module[] = [];

const classConstructors: {
    [name: string]: {
        cs: new (instanceID: string) => Module,
        iId: number,
    };
} = {};

export class ModuleManager {
    public static createClass(classname: string): Module {
        if (classConstructors[classname] === undefined) {
            throw new Error ('Classname cant be found ' + classname);
        }
        classConstructors[classname].iId += 1;
        const inst = new (classConstructors[classname].cs)(classname + '_' + classConstructors[classname].iId);
        runtime.push(inst);
        setTimeout(() => inst.start(), 100);
        return inst;
    }
    public static registerClass(cl: new (instanceID: string) => Module, module: NodeModule): string {
        const classname = path.parse(module.filename).name;
        if (classConstructors[classname] !== undefined) {
            throw Error('Class Registered a second time !' + classname);
        }
        classConstructors[classname] = {
            cs: cl,
            iId: 0,
        };
        if (process.mainModule === module) {
            ModuleManager.createClass(classname);
        }
        return classname;
    }
}
