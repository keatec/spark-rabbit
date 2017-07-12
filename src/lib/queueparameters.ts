
export class QParameters {
    public static getTTL(queuename: string) {
        if (queuename.substr(0, 3) === 'EV_') {
            return 60 * 60 * 1000;
        }
        if (queuename.substr(0, 9) === 'INCOMING_') {
            return 1 * 60 * 1000;
        }
        if (queuename === 'LOG_INFO') {
            return 3 * 60 * 1000;
        }
        if (queuename === 'LOG_WARN') {
            return 60 * 60 * 1000;
        }
        if (queuename === 'LOG_ERROR') {
            return 24 * 60 * 60 * 1000;
        }
        return 3 * 60 * 1000;
    }
}
