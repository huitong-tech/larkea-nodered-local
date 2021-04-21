/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
    "use strict";
    var request = require("request");
    var mqttConfig = require("./lib/mqttConfig");
    // var nodeConfig = require("./lib/config").config;

    function LarkeaPubNode(config) {
        RED.nodes.createNode(this, config);
        this.larkeaOauth = config.larkeaOauth;
        const larkeaOauth = RED.nodes.getCredentials(this.larkeaOauth)
        this.product = config.product;
        this.device = config.device;
        this.topic = config.topic;
        this.deviceSecret = config.deviceSecret
        this.broker = larkeaOauth.broker;
        this.brokerurl = 'mqtt://' + larkeaOauth.broker + ':' + larkeaOauth.port;
        this.clientid = this.product + '.' + this.device;
        this.connected = false;
        this.connecting = false;
        this.closing = false;
        this.options = {
            clientId: this.product + '.' + this.device,
            username: this.product + '.' + this.device,
            password: this.deviceSecret,
            keepalive: 60,
            clean: true,
            reconnectPeriod: 15000
        };
        this.mqttClient = mqttConfig;
        this.qos = larkeaOauth.qos;
        this.datatype = "utf8";
        var node = this;
        this.status({fill:"red",shape:"ring",text:"node-red:common.status.disconnected"});
        node.mqttClient.register(node,RED);
        if (node.connected) {
            node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
        }
        this.on('input',function (msg,send,done) {
            msg.topic = node.topic;
            if (msg.hasOwnProperty("payload")) {
                if (msg.hasOwnProperty("topic") && (typeof msg.topic === "string") && (msg.topic !== "")) { // topic must exist
                    this.mqttClient.publish(node, msg, done);  // send the message
                    node.status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
                } else {
                    node.warn(RED._("mqtt.errors.invalid-topic"));
                    done();
                }
            } else {
                done();
            }
        });
        this.on('close', function(done) {
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
            node.mqttClient.deregister(node,done);
        });
    }
    RED.nodes.registerType("Larkea Local Public",LarkeaPubNode);

    var accessToken = null;
    var url = null;

    // 获取token
    RED.httpAdmin.get("/larkea-token", function(req,res) {
        var bol = null;
        var nodeId = req.query.nodeId;
        console.log(nodeId)
        if (nodeId !== '_ADD_') {
            var oauthNode = RED.nodes.getCredentials(nodeId);
            console.log(oauthNode)
            if (oauthNode) {
                accessToken = oauthNode.accessToken;
                url = oauthNode.domain;
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
