"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const runtime = [];
const classConstructors = {};
class ModuleManager {
    static createClass(classname) {
        if (classConstructors[classname] === undefined) {
            throw new Error('Classname cant be found ' + classname);
        }
        classConstructors[classname].iId += 1;
        const inst = new (classConstructors[classname].cs)(classname + '_' + classConstructors[classname].iId);
        runtime.push(inst);
        setTimeout(() => inst.start(), 100);
        return inst;
    }
    static registerClass(cl, module) {
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
exports.ModuleManager = ModuleManager;
//# sourceMappingURL=modulemanager.js.map