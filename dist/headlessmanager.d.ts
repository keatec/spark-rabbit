import { EventProvider, EventPublisher } from 'spark-protocol';
import { IData } from './lib/rabbit';
declare class HeadLessManagers {
    private eventPublisher;
    private eventProvider;
    private rabbit;
    constructor(eventPublisher: EventPublisher, eventProvider: EventProvider);
    run: (method: string, context: IData) => Promise<IData>;
}
export default HeadLessManagers;
