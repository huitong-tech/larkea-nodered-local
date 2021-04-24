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
    var isUtf8 = require('is-utf8');
    var request = require("request");
    var mqttConfig = require("./lib/mqttConfig");
    // var nodeConfig = require("./lib/config").config;

    function LarkeaSubNode(config) {
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
        this.closing = false;
        this.connecting = false;
        const username = larkeaOauth.username ? larkeaOauth.username : (this.product + '.' + this.device)
        const password = larkeaOauth.password ? larkeaOauth.password: this.deviceSecret
        let clientId = this.product + '.' + this.device
        if (larkeaOauth.username && larkeaOauth.password) {
            clientId = 'mqtt_' + (1+Math.random()*4294967295).toString(16) + '.' + this.larkeaOauth
        }
        this.options = {
            clientId: clientId,
            username: username,
            password: password,
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
            } else {
                node.status({fill:"red",shape:"ring",text:"node-red:common.status.disconnected"});
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
};
