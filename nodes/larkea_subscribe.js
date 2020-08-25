module.exports = function(RED) {
    "use strict";
    var isUtf8 = require('is-utf8');
    var request = require("request");
    var mqttConfig = require("./lib/mqttConfig");
    var nodeConfig = require("./lib/config").config;

    function LarkeaSubNode(config) {
        RED.nodes.createNode(this, config);
        this.product = config.product;
        this.device = config.device;
        this.topic = config.topic;
        this.deviceSecret = config.deviceSecret
        this.broker = nodeConfig.broker;
        this.brokerurl = 'mqtt://' + nodeConfig.broker + ':' + nodeConfig.port;
        this.clientid = this.product + '.' + this.device;
        this.connected = false;
        this.closing = false;
        this.connecting = false;
        this.options = {
            clientId: this.product + '.' + this.device,
            username: this.product + '.' + this.device,
            password: this.deviceSecret,
            keepalive: 60,
            clean: true,
            reconnectPeriod: 15000
        };
        this.mqttClient = mqttConfig;
        this.qos = nodeConfig.mqtt.qos;
        this.datatype = "utf8";
        var node = this;
        this.status({fill:"red",shape:"ring",text:"node-red:common.status.disconnected"});
        node.mqttClient.register(node,RED);
        if ((typeof this.topic === "string") && (this.topic !== "")) {
            var subTopic = node.topic;
            this.mqttClient.subscribe(node,subTopic,this.qos,function(topic,payload,packet) {
                if (node.datatype === "buffer") {
                    // payload = payload;
                } else if (node.datatype === "base64") {
                    payload = payload.toString('base64');
                } else if (node.datatype === "utf8") {
                    payload = payload.toString('utf8');
                } else if (node.datatype === "json") {
                    if (isUtf8(payload)) {
                        payload = payload.toString();
                        try { payload = JSON.parse(payload); }
                        catch(e) { node.error(RED._("mqtt.errors.invalid-json-parse"),{payload:payload, topic:topic, qos:packet.qos, retain:packet.retain}); return; }
                    }
                    else { node.error((RED._("mqtt.errors.invalid-json-string")),{payload:payload, topic:topic, qos:packet.qos, retain:packet.retain}); return; }
                } else {
                    if (isUtf8(payload)) { payload = payload.toString(); }
                }
                var msg = {topic:topic, payload:payload, qos:packet.qos, retain:packet.retain};
                if ((node.mqttClient.broker === "localhost")||(node.mqttClient.broker === "127.0.0.1")) {
                    msg._topic = topic;
                }
                node.send(msg);
                node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
            }, this.id);
            if (this.connected) {
                node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
            }
            this.on('close', function(removed, done) {
                node.closing = true;
                if (node.connected) {
                    node.client.once('close', function() {
                        done();
                    });
                    node.client.end();
                } else if (node.connecting || node.client.reconnecting) {
                    node.client.end();
                    done();
                } else {
                    done();
                }
                node.mqttClient.unsubscribe(node,node.topic,node.id, removed);
                node.mqttClient.deregister(node,done);
            });
        }
    }
    RED.nodes.registerType("Larkea Local Subscribe",LarkeaSubNode);

    var url = nodeConfig.larkeaUrl;
    var accessToken = null;
    // 获取token
    RED.httpAdmin.get("/larkea-token", function(req,res) {
        var bol = null;
        var nodeId = req.query.nodeId;
        if (nodeId !== '_ADD_') {
            var oauthNode = RED.nodes.getCredentials(nodeId);
            if (oauthNode) {
                accessToken = oauthNode.accessToken;
                bol = !!accessToken;
                res.json({ success: bol });
            } else {
                res.json({success: false});
            }
        } else {
            res.json({success: false});
        }
    });

    // 获取产品
    RED.httpAdmin.get("/larkea-product", function(req,res) {
        var rq = {};
        rq.url = url + '/api/products?limit=10000';
        rq.method = 'GET';
        rq.headers = {
            'x-larkea-token': accessToken
        };
        try {
            request(rq, function(err, resp, body) {
                if(!err && res.statusCode === 200){
                    res.json(body);
                }else{
                    console.log('get_place error:', err);
                    res.json(body);
                }
            });
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });
    // 获取设备
    RED.httpAdmin.get("/larkea-device", function(req,res) {
        var rq = {};
        rq.url = url + '/api/devices?limit=10000&productKey=' + req.query.name;
        rq.method = 'GET';
        rq.headers = {
            'x-larkea-token': accessToken
        };
        try {
            request(rq, function(err, resp, body) {
                if(!err && res.statusCode === 200){
                    res.json(body);
                }else{
                    console.log('get_sensor error:', err);
                    res.json(body);
                }
            });
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });

    // 获取主题
    RED.httpAdmin.get("/larkea-topic", function(req,res) {
        var rq = {};
        rq.url = url + '/api/products/' + req.query.productId + '/topics';
        rq.method = 'GET';
        rq.headers = {
            'x-larkea-token': accessToken
        };
        try {
            request(rq, function(err, resp, body) {
                if(!err && res.statusCode === 200){
                    res.json(body);
                }else{
                    console.log('get_property error:', err);
                    res.json(body);
                }
            });
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });
};
