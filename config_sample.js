var config = {
    database: {
        connectionString: "mongodb://localhost/tradingbot",
        candleCollection: 'candles'
    },
    mode: "backtest",
    historySize: 50,
    candleSize: 5,
    customCandleSize: 5,

    strategy : {
        bb:{
            timePeriod: 24,
            positionSize: 4,
        },
         ppo:{
             short: 21,
             long: 42,
             signal: 9,
             down: -0.05,
             up:  0.15,
             persistenceUp: 1,
             persistenceDown: 1,

         },
        /* ppo:{
            short: 21,
            long: 42,
            signal: 9,
            down: -0.1,
            up:  0.15,
            persistenceUp: 1,
            persistenceDown: 1,
        },*/
        volume:{
            timePeriod: 48,
            treshold: 1,
            minVolume: 1000,
        },
        rsi:{
            interval: 40,
            low: 40,
            high: 60,
        },
        cci:{
            constant: 0.015,
            history: 14,
            up: 100,
            down: -100,
            persistence: 0
        }
    },

    watch:{
        exchange: 'bitfinex'
    },
    trader: {
        key: "",
        secret:"",
        parallelTrades: 2,
        stopLossPercent: 6,
        percentToInvest: 50,
        real: true,
    },
    importer: {
        daterange: {
            from: "2018-01-10 00:00:00",
            to: "2018-01-28 06:00:00"
        }
    },
    backtest: {
        daterange: {
             from: "2018-01-01 00:00:00",
            to: "2018-01-15 06:00:00"
        }
    },
    debug: true,

    telegrambot: {
        token: '',
        botName: '',
        chat_id: -1
    }
};

module.exports = config;
