// required indicators
var EMA = require('./EMA.js');


class MACD {
    constructor(settings) {
        this.input = 'close';
        this.diff = false;
        this.short = new EMA(settings.short);
        this.long = new EMA(settings.long);
        this.signal = new EMA(settings.signal);
    }

    update(price) {
        this.short.update(price);
        this.long.update(price);
        this.calculateEMAdiff();
        this.signal.update(this.diff);
        this.result = this.diff - this.signal.result;
    }

    calculateEMAdiff() {
        let shortEMA = this.short.result;
        let longEMA = this.long.result;

        this.diff = shortEMA - longEMA;
    }
}
module.exports = MACD;
