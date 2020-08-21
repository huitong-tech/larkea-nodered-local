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
    var qs  =require("qs");
    var request = require("request");
    var nodeConfig = require("./lib/config").config;
    function LarkOauthNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
    }

    RED.nodes.registerType("lark-oauth",LarkOauthNode, {
        credentials: {
            accessKey: { value:"" },
            accessSecret: { value:"" },
            accessToken: { type: "password" },
            refreshToken: { type: "password" }
        }
    });

    var url = nodeConfig.larkUrl;
    var r = null;

    // 获取token
    RED.httpAdmin.get("/lark-oauth", function(req,res) {
        var data = {
            "accessKey": req.query.accessKey,
            "accessSecret": req.query.accessSecret,
            "grantType": "CLIENT_CREDENTIALS"
        };
        const credentials = {
            "accessKey": req.query.accessKey,
            "accessSecret": req.query.accessSecret,
        };
        var nodeId = req.query.nodeId;
        var rq = {};
        rq.url = url + '/api/oauth2/token';
        rq.method = 'POST';
        rq.body = qs.stringify(data);
        rq.headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        try {
            request(rq, function(err, resp, body) {
                if(!err && resp.statusCode === 200){
                    credentials.accessToken = JSON.parse(body).data.accessToken;
                    credentials.refreshToken = JSON.parse(body).data.refreshToken;
                    RED.nodes.addCredentials(nodeId, credentials);
                    res.json(body);
                }else{
                    console.log('oauth error:', body);
                    res.json(body)
                }
            });
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });

    // 刷新token
    RED.httpAdmin.get("/lark-refresh", function(req,res) {
        var oauthNode = RED.nodes.getCredentials(req.query.nodeId);
        var data = {
            "refreshToken": oauthNode.refreshToken,
            "grantType": "REFRESH_TOKEN"
        };
        var rq = {};
        rq.url = url + '/api/oauth2/token/refresh';
        rq.method = 'POST';
        rq.body = qs.stringify(data);
        rq.headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        try {
            if (r !== oauthNode.refreshToken) {
                r = oauthNode.refreshToken;
                request(rq, function(err, resp, body) {
                    if(!err && resp.statusCode === 200){
                        const credentials = {
                            "accessKey": oauthNode.accessKey,
                            "accessSecret": oauthNode.accessSecret,
                            "accessToken": JSON.parse(body).data.accessToken,
                            "refreshToken": JSON.parse(body).data.refreshToken
                        };
                        RED.nodes.addCredentials(req.query.nodeId, credentials)
                        res.json(JSON.parse(body));
                    }else{
                        console.log('refresh error:', body);
                        res.json(JSON.parse(body))
                    }
                });
            }
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });
};
