// required indicators
var EMA = require('./EMA.js');

class PPO {
    constructor(settings) {
        this.result = {};
        this.input = 'close';
        this.macd = 0;
        this.ppo = 0;
        this.short = new EMA(settings.short);
        this.long = new EMA(settings.long);
        this.MACDsignal = new EMA(settings.signal);
        this.PPOsignal = new EMA(settings.signal);
        this.age = 0;
    }

    update(price) {
        this.age ++;
        this.short.update(price);
        this.long.update(price);
        this.calculatePPO();

        this.MACDsignal.update(this.result.macd);
        this.MACDhist = this.result.macd - this.MACDsignal.result;
        this.PPOsignal.update(this.result.ppo || 0);

        this.PPOhist = this.result.ppo - this.PPOsignal.result;

        this.result.MACDsignal = this.MACDsignal.result;
        this.result.MACDhist = this.MACDhist;
        this.result.PPOsignal = this.PPOsignal.result;
        this.result.PPOhist = this.PPOhist;
    }

    calculatePPO() {
        this.result.shortEMA = this.short.result;
        this.result.longEMA = this.long.result;
        this.result.macd = this.result.shortEMA - this.result.longEMA;
        this.result.ppo = 100 * (this.result.macd / this.result.longEMA);
    }
}

module.exports = PPO;
