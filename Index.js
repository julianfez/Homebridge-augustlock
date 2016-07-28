var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerAccessory("homebridge-augustlock", "augustlock", augustLockAccesory);
}

function augustLockAccesory(log, config) {
    this.log = log;
    this.name = config["name"];
    this.accessToken = config["api_token"];
    this.lockID = config["lock_id"];

    this.service = new Service.LockMechanism(this.name);

    this.service
        .getCharacteristic(Characteristic.LockCurrentState)
        .on('get', this.getState.bind(this));

    this.service
        .getCharacteristic(Characteristic.LockTargetState)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));
}

augustLockAccesory.prototype.getState = function(callback) {
    this.log("Getting current state...");

    request.get({
        url: "https://api-production.august.com/locks/"+this.lockID,
        "headers": {
            "Content-Type": 'application/json',
            'x-kease-api-key': '14445b6a2dba',
            'x-august-access-token': this.accessToken,
            'Proxy-Connection': 'keep-alive',
            'userAgent': 'August/4.4.42 (iPhone; iOS 9.0.2; Scale/2.00)',
            'accept-version': '0.0.1',
            'accept-Language': 'en-US;q=1'
        }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            var json = JSON.parse(body);
            var state = json.LockStatus.status; // "lock" or "unlock"
            this.log("Lock state is %s", state);
            var locked = state == "locked"
            callback(err, locked); // success
        }
        else {
            this.log("Error getting state (status code %s): %s", status, err);
            callback(err);
        }
    }.bind(this));
}

augustLockAccesory.prototype.setState = function(state, callback) {
    var augustState = (state == Characteristic.LockTargetState.SECURED) ? "lock" : "unlock";

    this.log("Set state to %s", augustState);

    request.put({
        url: "https://api-production.august.com/remoteoperate/"+this.lockID +"/" +augustState,
        "headers": {
            "Content-Type": 'application/json',
            'x-kease-api-key': '14445b6a2dba',
            'x-august-access-token': this.accessToken,
            'Proxy-Connection': 'keep-alive',
            'userAgent': 'August/4.4.42 (iPhone; iOS 9.0.2; Scale/2.00)',
            'accept-version': '0.0.1',
            'accept-Language': 'en-US;q=1'
        }
    }, function(err, response, body) {

        if (!err && response.statusCode == 200) {
            this.log("State change complete.");

            // we succeeded, so update the "current" state as well
            var currentState = (state == Characteristic.LockTargetState.SECURED) ?
                Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;

            this.service
                .setCharacteristic(Characteristic.LockCurrentState, currentState);

            callback(null); // success
        }
        else {
            this.log("Error '%s' setting lock state. Response: %s", err, body);
            callback(err || new Error("Error setting lock state."));
        }
    }.bind(this));
},

    augustLockAccesory.prototype.getServices = function() {
        return [this.service];
    }