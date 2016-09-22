var request = require("request");
var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory("homebridge-augustlock", "augustlock", augustLockAccesory);
}

function augustLockAccesory(log, config) {
  this.poolingInterval = config["poolingInterval"];;
  this.log = log;
  this.name = config["name"];
  this.accessToken = config["api_token"];
  this.lockID = config["lock_id"];
  this.isClosed = undefined;
  this.model = "";

  this.service = new Service.LockMechanism(this.name);

  this.service
      .getCharacteristic(Characteristic.LockCurrentState)
      .on('get', this.getState.bind(this));

  this.service
      .getCharacteristic(Characteristic.LockTargetState)
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this));

      this.battservice = new Service.BatteryService(this.name);

    this.battservice
        .getCharacteristic(Characteristic.BatteryLevel)
        .on('get', this.getBattery.bind(this));

    this.battservice
        .getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', this.getLowBatt.bind(this));

  this.init();

}

augustLockAccesory.prototype = {
  init: function() {

    this.log('init');

    this.infoService = new Service.AccessoryInformation();
    this.infoService
        .setCharacteristic(Characteristic.Manufacturer, this.model)
        .setCharacteristic(Characteristic.Model, "august-connect")
        .setCharacteristic(Characteristic.SerialNumber, "L1GFU002HJ");


    setTimeout(this.monitorState.bind(this), 1500);
  },
  monitorState: function() {

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
           var batt = json.battery * 100;
           var manufacturer = json.Bridge.deviceModel
           var locked = state == "locked";
           var unlocked = state == "unlocked"

           manufacturer == this.model


          var augustState = (state == 'locked') ? true : false;

          if (augustState != this.isClosed) {

            this.log("Lock state is change to %s - %s", augustState, this.isClosed, batt, manufacturer);

            this.isClosed = augustState;

            this.service
            .setCharacteristic(Characteristic.LockCurrentState, this.isClosed);

           this.service
            .setCharacteristic(Characteristic.LockTargetState, this.isClosed);
          }

       }
       else {
           this.log('Server error');

       }
   }.bind(this));

	     setTimeout(this.monitorState.bind(this), 1500);
},
  getState: function(callback) {

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
           var locked = state == "locked";
           var locked = state == "locked"


          var augustState = (state == 'locked') ? true : false;

          this.isClosed = augustState;

          callback(null, augustState);

       }
       else {
            this.log('Server error');
           callback(err);
         }
     }.bind(this));
  },
  getBattery: function(callback) {
    this.log("Getting current battery...");

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
            var batt = json.battery * 100;
            this.log("Lock battery is %s", batt);
            callback(null, batt); // success
        }
        else {
            this.log("Error getting battery (status code %s): %s", response.statusCode, err);
            callback(err);
        }
    }.bind(this));
},
getLowBatt: function(callback) {
  this.log("Getting current battery...");

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
            var batt = json.battery;
            this.log("Lock battery is %s", batt);
            var low = (batt > 0.20) ? Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL : Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
            callback(null, low); // success
        }
        else {
            this.log("Error getting battery (status code %s): %s", response.statusCode, err);
            callback(err);
        }
    }.bind(this));
},
  setState: function(state, callback) {

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

            var json = JSON.parse(body);
            var batt = json.battery * 100;

            this.battservice
                .setCharacteristic(Characteristic.BatteryLevel, batt);


            clearTimeout();
            callback(err, state);
        }
        else {
            this.log("Error '%s' setting lock state. Response: %s", err, body);
            callback(err || new Error("Error setting lock state."));
        }
    }.bind(this));
  }
}

augustLockAccesory.prototype.getServices = function() {
  return [this.infoService, this.service, this.battservice];
}
