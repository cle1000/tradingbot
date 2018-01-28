var _ = require('lodash');

class VOLUME {
    constructor(settings) {
        this.input = 'volume';
        this.windowLength = settings.timePeriod;
        this.treshold = settings.treshold;
        this.minVolume = settings.minVolume;
        this.volumes = [];
        this.result = 0;
        this.age = 0;
        this.sum = 0;
    }

    update(volume) {
        let tail = this.volumes[this.age] || 0; // oldest price in window
        this.volumes[this.age] = volume;
        this.sum += volume - tail;


        let zeros = _.size(_.filter(this.volumes, v => v == 0));
        let allowedZeros = this.volumes.length / 100 * this.treshold;
        this.result = zeros <= allowedZeros && this.sum > this.minVolume;
        this.age = (this.age + 1) % this.windowLength;
    }
}

module.exports = VOLUME;
