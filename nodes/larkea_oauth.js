module.exports = function(RED) {
    "use strict";
    var qs  =require("qs");
    var request = require("request");
    var nodeConfig = require("./lib/config").config;
    function LarkeaOauthNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
    }

    RED.nodes.registerType("larkea-oauth",LarkeaOauthNode, {
        credentials: {
            accessKey: { value:"" },
            accessSecret: { value:"" },
            accessToken: { type: "password" },
            refreshToken: { type: "password" }
        }
    });

    var url = nodeConfig.larkeaUrl;
    var r = null;

    // 获取token
    RED.httpAdmin.get("/larkea-oauth", function(req,res) {
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
    RED.httpAdmin.get("/larkea-refresh", function(req,res) {
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
