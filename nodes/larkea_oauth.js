module.exports = function(RED) {
    "use strict";
    var qs  =require("qs");
    var request = require("request");
    var nodeConfig = require("./lib/config").config;
    function LarkeaOauthNode(config) {
        RED.nodes.createNode(this, config);
        this.broker = config.broker;
        this.port = config.port;
        this.qos = config.qos;
        this.username = config.username;
        this.password = config.password;
        this.domain = config.domain;
        this.accessKey = this.credentials.accessKey;
        this.accessSecret = this.credentials.accessSecret;
        this.accessToken = this.credentials.accessToken;
        this.refreshToken = this.credentials.refreshToken;
        const credentials = {
            "broker": this.broker,
            "port": this.port,
            "qos": this.qos,
            "domain": this.domain,
            "accessKey": this.accessKey,
            "accessSecret": this.accessSecret,
            "accessToken": this.accessToken,
            "refreshToken": this.refreshToken
        };
        if (this.username) { credentials['username'] = this.username }
        if (this.password) { credentials['password'] = this.password }
        RED.nodes.addCredentials(config.id, credentials);
    }

    RED.nodes.registerType("larkea-oauth",LarkeaOauthNode, {
        credentials: {
            broker: { type: "text" },
            port: { type: "text" },
            qos: { type: "text" },
            username: { type: "text" },
            password: { type: "password" },
            domain: { type: "text" },
            accessKey: { type: "text" },
            accessSecret: { type: "text" },
            accessToken: { type: "text" },
            refreshToken: { type: "text" }
        }
    });

    // var url = nodeConfig.larkeaUrl;
    var refresh = null;

    // 获取token
    RED.httpAdmin.get("/larkea-oauth", function(req,res) {
        var data = {
            "accessKey": req.query.accessKey,
            "grantType": "CLIENT_CREDENTIALS",
            "accessSecret": req.query.accessSecret,
        };
        const credentials = {
            "broker": req.query.broker,
            "port": req.query.port,
            "qos": req.query.qos,
            "domain": req.query.domain,
            "accessKey": req.query.accessKey,
            "accessSecret": req.query.accessSecret,
        };
        if (req.query.username) { credentials['username'] = req.query.username }
        if (req.query.password) { credentials['password'] = req.query.password }
        var nodeId = req.query.nodeId;
        var rq = {};
        rq.url = req.query.domain + '/api/oauth2/token';
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
                    res.json(body);
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
            "grantType": "REFRESH_TOKEN",
            "refreshToken": oauthNode.refreshToken
        };
        var rq = {};
        rq.url = oauthNode.domain + '/api/oauth2/token/refresh';
        rq.method = 'POST';
        rq.body = qs.stringify(data);
        rq.headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        try {
            if (refresh !== oauthNode.refreshToken) {
                refresh = oauthNode.refreshToken;
                request(rq, function(err, resp, body) {
                    if(!err && resp.statusCode === 200){
                        const credentials = {
                            "broker": oauthNode.broker,
                            "port": oauthNode.port,
                            "qos": oauthNode.qos,
                            "domain": oauthNode.domain,
                            "accessKey": oauthNode.accessKey,
                            "accessSecret": oauthNode.accessSecret,
                            "accessToken": JSON.parse(body).data.accessToken,
                            "refreshToken": JSON.parse(body).data.refreshToken
                        };
                        if (oauthNode.username) { credentials['username'] = oauthNode.username }
                        if (oauthNode.password) { credentials['password'] = oauthNode.password }
                        RED.nodes.addCredentials(req.query.nodeId, credentials);
                        res.json(JSON.parse(body));
                    }else{
                        console.log('refresh error:', body);
                        res.json(JSON.parse(body));
                    }
                });
            }
        }
        catch (e) {
            console.log('catch error:', e);
        }
    });
};
