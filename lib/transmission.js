//node utils
var http = require('http');
var util = require('util');
var path = require('path');
var fs = require('fs');
var url = require('url');
var events = require('events');

var uuid = require('./utils').uuid;

var Transmission = module.exports = function(options) {

	events.EventEmitter.call(this);
	this.url = '/transmission/rpc';
	this.host = options.host || 'localhost';
	this.port = options.port || 9091;
	this.key = '';

	if (options.username) {
		this.authHeader = 'Basic ' + new Buffer(options.username + (options.password ? ':' + options.password : '')).toString('base64');
	}

};
// So will act like an event emitter
util.inherits(Transmission, events.EventEmitter);

function onResult(callback) {

	return function(result) {
		if (result.result === 'success') {
			callback(null, result.arguments)
		} else {
			callback(new Error(result.result))
		}
	}
}

Transmission.prototype.add = function(path, callback) {
	this.callServer({
		arguments : {
			filename : path
		},
		method : this.methods.torrents.add,
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.remove = function(ids, del, callback) {
	this.callServer({
		arguments : {
			ids : ids,
			"delete-local-data" : !!del
		},
		method : this.methods.torrents.remove,
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.get = function(ids, callback) {
	var options = {
		arguments : {
			fields : this.methods.torrents.feilds,
			ids : ids
		},
		ids : '',
		method : 'torrent-get',
		tag : uuid()
	}

	if ( typeof ids == 'function') {
		callback = ids
		options.arguments.ids = ''
	}

	var self = this;
	self.callServer(options, onResult(callback))
}
Transmission.prototype.stop = function(ids, callback) {
	var self = this;
	self.callServer({
		arguments : {
			ids : Array.isArray(ids) ? ids : [ids]
		},
		ids : '',
		method : 'torrent-stop',
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.start = function(ids, callback) {
	var self = this;
	self.callServer({
		arguments : {
			ids : ids
		},
		ids : '',
		method : 'torrent-start',
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.startNow = function(ids, callback) {
	var self = this;
	self.callServer({
		arguments : {
			ids : ids
		},
		ids : '',
		method : 'torrent-start-now',
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.update = function(callback) {
	var self = this;
	self.callServer({
		arguments : {
			fields : this.methods.torrents.feilds
		},
		ids : '',
		method : 'torrent-get',
		tag : uuid()
	}, onResult(callback))
}
Transmission.prototype.callServer = function(query, callBack) {
	var self = this;

	var options = {
		host : this.host,
		path : this.url,
		port : this.port,
		method : 'POST',
		headers : {
			'Time' : new Date(),
			'Host' : this.host + ':' + this.port,
			'X-Requested-With' : 'Node',
			'X-Transmission-Session-Id' : this.key
		}
	};

	if (this.authHeader) {
		options.headers['Authorization'] = this.authHeader;
	}

	function onResponse(response) {
		var page = [];

		function onData(chunk) {
			page.push(chunk);
		}

		function onEnd() {
			if (response.statusCode == 409) {
				self.key = response.headers['x-transmission-session-id'];
				return self.callServer(query, callBack);
			} else if (response.statusCode == 200) {
				callBack(JSON.parse(unescape(page.join(''))));
			}
		}


		response.setEncoding('utf8');
		response.on('data', onData);
		response.on('end', onEnd);
	}


	http.request(options, onResponse).end(JSON.stringify(query), 'utf8');
};
Transmission.prototype.methods = {
	torrents : {
		stop : 'torrent-stop',
		start : 'torrent-start',
		verify : 'torrent-verify',
		reannounce : 'torrent-reannounce',
		stop : 'torrent-start',
		set : 'torrent-set',
		setTypes : {
			'bandwidthPriority' : true,
			'downloadLimit' : true,
			'downloadLimited' : true,
			'files-wanted' : true,
			'files-unwanted' : true,
			'honorsSessionLimits' : true,
			'ids' : true,
			'location' : true,
			'peer-limit' : true,
			'priority-high' : true,
			'priority-low' : true,
			'priority-normal' : true,
			'seedRatioLimit' : true,
			'seedRatioMode' : true,
			'uploadLimit' : true,
			'uploadLimited' : true
		},
		add : 'torrent-add',
		addTypes : {
			'download-dir' : true,
			'filename' : true,
			'metainfo' : true,
			'paused' : true,
			'peer-limit' : true,
			'files-wanted' : true,
			'files-unwanted' : true,
			'priority-high' : true,
			'priority-low' : true,
			'priority-normal' : true
		},
		remove : 'torrent-remove',
		removeTypes : {
			'ids' : true,
			'delete-local-data' : true
		},
		location : 'torrent-set-location',
		locationTypes : {
			'location' : true,
			'ids' : true,
			'move' : true
		},
		get : 'torrent-get',
		feilds : ['activityDate', 'addedDate', 'bandwidthPriority', 'comment', 'corruptEver', 'creator', 'dateCreated', 'desiredAvailable', 'doneDate', 'downloadDir', 'downloadedEver', 'downloadLimit', 'downloadLimited', 'error', 'errorString', 'eta', 'files', 'fileStats', 'hashString', 'haveUnchecked', 'haveValid', 'honorsSessionLimits', 'id', 'isFinished', 'isPrivate', 'leftUntilDone', 'magnetLink', 'manualAnnounceTime', 'maxConnectedPeers', 'metadataPercentComplete', 'name', 'peer-limit', 'peers', 'peersConnected', 'peersFrom', 'peersGettingFromUs', 'peersKnown', 'peersSendingToUs', 'percentDone', 'pieces', 'pieceCount', 'pieceSize', 'priorities', 'rateDownload', 'rateUpload', 'recheckProgress', 'seedIdleLimit', 'seedIdleMode', 'seedRatioLimit', 'seedRatioMode', 'sizeWhenDone', 'startDate', 'status', 'trackers', 'trackerStats ', 'totalSize', 'torrentFile', 'uploadedEver', 'uploadLimit', 'uploadLimited', 'uploadRatio', 'wanted', 'webseeds', 'webseedsSendingToUs']
	},
	session : {
		stats : 'session-stats',
		get : 'session-get',
		set : 'session-set',
		setTypes : {
			'alt-speed-down' : true,
			'alt-speed-enabled' : true,
			'alt-speed-time-begin' : true,
			'alt-speed-time-enabled' : true,
			'alt-speed-time-end' : true,
			'alt-speed-time-day' : true,
			'alt-speed-up' : true,
			'blocklist-enabled' : true,
			'dht-enabled' : true,
			'encryption' : true,
			'download-dir' : true,
			'peer-limit-global' : true,
			'peer-limit-per-torrent' : true,
			'pex-enabled' : true,
			'peer-port' : true,
			'peer-port-random-on-start' : true,
			'port-forwarding-enabled' : true,
			'seedRatioLimit' : true,
			'seedRatioLimited' : true,
			'speed-limit-down' : true,
			'speed-limit-down-enabled' : true,
			'speed-limit-up' : true,
			'speed-limit-up-enabled' : true
		}
	},
	other : {
		blockList : 'blocklist-update',
		port : 'port-test'
	}
};
