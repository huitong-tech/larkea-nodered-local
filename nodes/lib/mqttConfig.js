var mqtt = require("mqtt");

var clientList = [];

var users = {}

var subscriptions = {}

function matchTopic(ts,t) {
  if (ts === "#") {
    return true;
  }
  else if(ts.startsWith("$share")){
    ts = ts.replace(/^\$share\/[^#+/]+\/(.*)/g,"$1");

  }
  var re = new RegExp("^"+ts.replace(/([\[\]\?\(\)\\\\$\^\*\.|])/g,"\\$1").replace(/\+/g,"[^/]+").replace(/\/#$/,"(\/.*)?")+"$");
  return re.test(t);
}

var register = function(node,RED) {
  users[node.id] = node;
  if (Object.keys(users).length >= 1) {
    connect(node,RED);
  }
};

var deregister = function(node,done) {
  delete users[node.id];
  clientList = Object.keys(users).length === 0 ? [] : clientList
  if (node.closing) {
    return done();
  }
  if (Object.keys(users).length >= 0) {
    if (node.client && node.client.connected) {
      return node.client.end(done);
    } else {
      node.client.end();
      return done();
    }
  }
  done();
};

var connect = function (node,RED) {
  if (!node.connected && !node.connecting) {
    node.connecting = true;
    try {
      if (clientList.length>0) {
        var client = clientList.find(c => c.options.clientId === node.options.clientId)
        if (!!client) {
          node.client = client
        } else {
          node.client = mqtt.connect(node.brokerurl ,node.options);
          clientList.push(node.client)
        }
      } else {
        node.client = mqtt.connect(node.brokerurl ,node.options);
        clientList.push(node.client)
      }
      node.client.setMaxListeners(0);
      // Register successful connect or reconnect handler
      node.client.on('connect', function () {
        node.connecting = false;
        node.connected = true;
        node.log(RED._("mqtt.state.connected",{broker:(node.clientid?node.clientid+"@":"")+node.brokerurl}));
        for (var id in users) {
          if (users.hasOwnProperty(id)) {
            users[id].status({fill:"green",shape:"dot",text:"node-red:common.status.connected"});
          }
        }
        // Remove any existing listeners before resubscribing to avoid duplicates in the event of a re-connection
        node.client.removeAllListeners('message');

        // Re-subscribe to stored topics
        for (var s in subscriptions) {
          if (subscriptions.hasOwnProperty(s)) {
            var topic = s;
            var qos = 0;
            for (var r in subscriptions[s]) {
              if (subscriptions[s].hasOwnProperty(r)) {
                qos = Math.max(qos,subscriptions[s][r].qos);
                node.client.on('message',subscriptions[s][r].handler);
              }
            }
            var options = {qos: qos};
            node.client.subscribe(topic, options);
          }
        }

        // Send any birth message
        if (node.birthMessage) {
          node.publish(node.birthMessage);
        }
      });
      node.client.on("reconnect", function() {
        for (var id in users) {
          if (users.hasOwnProperty(id)) {
            users[id].status({fill:"yellow",shape:"ring",text:"node-red:common.status.connecting"});
          }
        }
      });
      // Register disconnect handlers
      node.client.on('close', function () {
        if (node.connected) {
          node.connected = false;
          node.log(RED._("mqtt.state.disconnected",{broker:(node.clientid?node.clientid+"@":"")+node.brokerurl}));
          for (var id in users) {
            if (users.hasOwnProperty(id)) {
              users[id].status({fill:"red",shape:"ring",text:"node-red:common.status.disconnected"});
            }
          }
        } else if (node.connecting) {
          node.log(RED._("mqtt.state.connect-failed",{broker:(node.clientid?node.clientid+"@":"")+node.brokerurl}));
        }
      });

      // Register connect error handler
      // The client's own reconnect logic will take care of errors
      node.client.on('error', function (error) {});
    }catch(err) {
      console.log(err);
    }
  }
};

var subscribe = function (node,topic,qos,callback,ref) {
  ref = ref||0;
  subscriptions[topic] = subscriptions[topic]||{};
  var sub = {
    topic:topic,
    qos:qos,
    handler:function(mtopic,mpayload, mpacket) {
      if (matchTopic(topic,mtopic)) {
        callback(mtopic,mpayload, mpacket);
      }
    },
    ref: ref
  };
  subscriptions[topic][ref] = sub;
  if (node.connected) {
    node.client.on('message',sub.handler);
    var options = {};
    options.qos = qos;
    node.client.subscribe(topic, options);
  }
};

var unsubscribe = function (node,topic, ref, removed) {
  ref = ref||0;
  var sub = subscriptions[topic];
  if (sub) {
    if (sub[ref]) {
      node.client.removeListener('message',sub[ref].handler);
      delete sub[ref];
    }
    if (removed) {
      if (Object.keys(sub).length >= 0) {
        delete subscriptions[topic];
        if (node.connected) {
          node.client.unsubscribe(topic);
        }
      }
    }
  }
};

var publish = function (node,msg,done) {
  if (node.connected) {
    if (msg.payload === null || msg.payload === undefined) {
      msg.payload = "";
    } else if (!Buffer.isBuffer(msg.payload)) {
      if (typeof msg.payload === "object") {
        msg.payload = JSON.stringify(msg.payload);
      } else if (typeof msg.payload !== "string") {
        msg.payload = "" + msg.payload;
      }
    }

    var options = {
      qos: msg.qos || 0,
      retain: msg.retain || false
    };
    node.client.publish(msg.topic, msg.payload, options, function(err) {
      done && done();
      return
    });
  }
};

module.exports = {
    register,
    deregister,
    connect,
    subscribe,
    unsubscribe,
    publish
};
