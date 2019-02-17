module.exports = function(RED) {
    "use strict";

    // load package dependencies
    var serveStatic = require('serve-static');
    var path = require('path');
    const ccxt = require('ccxt');
    const moment = require('moment');

    // load RED settings
    var app = RED.httpNode;
    var settings = RED.settings;

    app.use('/', serveStatic(path.join(__dirname, "images")));

    // ccxt: API
    function CcxtApi(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        // configure api methods
        if (RED.settings.httpNodeRoot !== false) {
            node.errorHandler = function(err, req, res, next) {
                node.warn(err);

                res.send(500);
            };

            node.callback = function(req, res) {
                // connect to exchange
                var exchange = new ccxt[req.query.exchange] ();

                // return api exchange
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ api: exchange.api }));
            } 

            node.corsHandler = function(req, res, next) { 
                next(); 
            }               
        }

        app.get('/apiMethods', node.corsHandler, node.callback, node.errorHandler);

        // execute ccxt API
        node.on('input', function (msg) {
            const asyncInput = async function async(config) {
                try {
                    // connect to exchange selected
                    var exchange = undefined;
                    
                    if (this.credentials.apikey)
                        exchange = new ccxt[config.exchange] (
                            {
                                apiKey: this.credentials.apikey,
                                secret: this.credentials.secret,
                            }
                        );
                    else
                        exchange = new ccxt[config.exchange] ();                    

                    // execute api
                    var result;

                    var api = config.api;
                    
                    var loadmarketsreload = config.loadmarketsreload;
                    var fetchtickersymbol = config.fetchtickersymbol;
                    var orderbooksymbol = config.orderbooksymbol;
                    var fetchohlcvsymbol = config.fetchohlcvsymbol;
                    var fetchohlcvtimeframe = config.fetchohlcvtimeframe;
                    var fetchohlcvsince = config.fetchohlcvsince;
                    var fetchohlcvlimit = config.fetchohlcvlimit;
                    var fetchtradessymbol = config.fetchtradessymbol;
                    
                    if (api === "loadMarkets") {
                        result = await exchange.loadMarkets(loadmarketsreload);
                    } else if (api === "fetchMarkets") {
                        result = await exchange.fetchMarkets();
                    } else if (api === "fetchTicker") {
                        result = await exchange.fetchTicker(fetchtickersymbol);
                    } else if (api === "fetchTickers") {
                        result = await exchange.fetchTickers();
                    } else if (api === "fetchOrderBook") {
                        result = await exchange.fetchOrderBook(orderbooksymbol);
                    } else if (api === "fetchOHLCV") {
                        if (fetchohlcvsince !== undefined)
                            fetchohlcvsince = moment(fetchohlcvsince).valueOf();

                        result = await exchange.fetchOHLCV(fetchohlcvsymbol, fetchohlcvtimeframe, fetchohlcvsince, fetchohlcvlimit);
                    } else if (api === "fetchTrades") {
                        result = await exchange.fetchTrades(fetchtradessymbol);
                    } else if (api === "customAPI") {
                        // test Kraken API
                        //console.log (new ccxt.kraken ());
                        //result = await exchange.privatePostBalance(); 
                        //result = await exchange.publicGetAssets();
                        //result = await exchange.publicGetTicker({book: 'btc_mxn'}) // for bitso
                        //result = await exchange.publicGetTicker({pair: 'BTCEUR, BCHEUR'}); // for kraken
                        //result = await exchange['publicGetTicker']({pair: 'BTCEUR, BCHEUR'}); // for kraken 
                        result = await exchange['publicGetOHLC']({pair: 'BTCEUR', interval: 30, since: 1550422800}); // for kraken                   
                    } else {
                        node.status({fill:"yellow", shape: "ring", text: "CCXT API not exist"});
                        node.warning("CCXT API not exist");
                    }

                    // clear any node error
                    node.status({});

                    // send api result
                    msg.payload = result;

                    node.send(msg);
                } catch(err) {
                    node.status({fill:"red", shape: "ring", text: "CCXT error"});
                    
                    node.error(err.message, msg);

                    return;
                }
            };

            asyncInput.apply(this, [config]);
        });
    }

    RED.nodes.registerType('ccxt-api', CcxtApi, {
        credentials: {
            apikey: {type: "text"},
            secret: {type: "text"}
        } 
    });
}