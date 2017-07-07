import { RabbitModule } from './lib/rabbitmodule';
declare class Rabs extends RabbitModule {
    constructor(instanceID: string);
    on_DEVICE_STATE(data: string): boolean;
    on_JEV_BEAT(data: string): boolean;
    start(): void;
}
export default Rabs;
