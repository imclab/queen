var _ = require("underscore"),
	EventEmitter = require("events").EventEmitter,
	useragent = require("useragent"),
	uuid = require('node-uuid');

var createLogger = require("./logger.js").create,
	isSimilar = require("./utils.js").isSimilar;

exports.create = create = function(socket, options){
	var options = options || {},
		emitter = options.emitter || new EventEmitter(),
		logger = options.logger || createLogger({prefix: "Browser"}),
		browser = new Browser(socket, emitter, logger);
	
	if(options.attributes){
		browser.setAttributes(options.attributes);	
	}
	
	return browser;
};

exports.Browser = Browser = function(socket, emitter, logger){
	var self = this;

	if(socket === void 0){
		throw "A Browser requires a socket";
	}

	if(emitter === void 0){
		throw "A Browser requires an emitter";
	}
	
	this._id = uuid.v4();
	this._attributes = {};
	this._isConnected = true;
	this._emitter = emitter;
	this._logger = logger;

	_.bindAll(this, "kill", "_echoHandler");

	this.setSocket(socket);

	this._emit("setId", this._id);
	this._logger.trace("Created");
};

Browser.prototype.getId = function(){
	return this._id;
};

Browser.prototype.isConnected = function(){
	return this._isConnected;
};

Browser.prototype.setConnected = function(connected){
	if(connected === void 0 || connected === this._isConnected){
		return this._isConnected;
	}

	if(connected === true){
		this._isConnected = true;
		this._echo("connected");
		this._logger.debug("Connected");
	} else {
		this._isConnected = false;
		this._echo("disconnected");
		this._logger.debug("Disconnected");
	}
};

Browser.prototype.setSocket = function(socket){
	if(this._socket === socket){
		return; // same socket as existing one
	}

	if(this._socket !== void 0){
		this._socket.removeListener("echo", this._echoHandler);
		this._socket.removeListener("kill", this.kill);
		this._logger.debug("Disconnected from socket");
	}

	this._socket = socket;
	if(this._socket !== void 0){
		this._socket.on("echo", this._echoHandler);
		this._socket.on("kill", this.kill);
		this._logger.debug("Connected to socket");
	}
};

Browser.prototype._echoHandler = function(data){
	var event = data.event,
		eventData = data.data;

	this._echo(event, eventData);
};

Browser.prototype._echo = function(event, data){
	this._emitter.emit(event, data);
};

Browser.prototype.kill = function(){
	this._echo("dead");
};

Browser.prototype.on = function(event, callback){
	this._emitter.on(event, callback);
};

Browser.prototype.once = function(event, callback){
	this._emitter.once(event, callback);
};

Browser.prototype.removeListener = function(event, callback){
	this._emitter.removeListener(event, callback);
};

Browser.prototype.getAttribute = function(key){
	return this._attributes[key];
};

Browser.prototype.hasAttributes = function(attritbuteMap){
	return  isSimilar(attritbuteMap, this._attributes);
};

Browser.prototype.getSocket = function(){
	return this._socket;
};

Browser.prototype.setAttributes = function(attributes){
	var ua;
	this._attributes = attributes || {};
	if(attributes.id !== void 0){
		this._id = attributes.id;
	}

	if(this._attributes.userAgent){
		ua = useragent.parse(attributes.userAgent);
		this._attributes.name = ua.toAgent();
		this._attributes.family = ua.family;
		this._attributes.os = ua.os;
		this._attributes.version = {
			major: ua.major,
			minor: ua.minor,
			path: ua.patch
		};
	}
};

Browser.prototype.getAttributes = function(){
	return _.extend({}, this._attributes);
};

Browser.prototype.emit = function(event, data){
	this._emit('echo', {
		event: event,
		data: data
	});
};

Browser.prototype._emit = function(event, data){
	this._socket.emit(event, data);
};