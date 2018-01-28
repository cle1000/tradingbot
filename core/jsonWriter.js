const fs = require('fs');


class JSONWriter{
    constructor(filename){
        this.filename = filename;
    }

    write(data){
        fs.writeFile(this.filename, "\n\n" + new Date().toISOString() + JSON.stringify(data, null, '\t'), () => 1);
    }
}

module.exports = JSONWriter;