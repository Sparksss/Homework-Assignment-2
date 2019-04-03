/**
 *  Primary file for the API
 * 
 */


// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');


var server = http.createServer(function(req, res){

    // Get the URL and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the headers as an object 
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;


    // Get the payload, if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', function(data){
        buffer += decoder.write(data);
    });

    req.on('end', function() {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, use the notFound 
        var choosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;


        // Construct the data object to send to the handler
         var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };


        choosenHandler(data, function(statusCode, payload) {
       

        statusCode = typeof(statusCode) == 'number' ? statusCode: 200;

        // Use the payload called back by the handler, or default
        payload = typeof(payload) == 'object' ? payload : {} ;

        // Convert the payload to a string
        var payloadString = JSON.stringify(payload);

        // Return the responce
        res.setHeader('Content-type', 'application/json');
        res.writeHead(statusCode);
        res.end(payloadString);

        console.log('Returning this responce : ', statusCode, payloadString);
        });
    });

});


server.listen(config.httpPort, function(){
    console.log("The server is listening on port 3000 on localhost");
});



var router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks,
    'shoppingcart': handlers.shoppingcart,
    'showmenu': handlers.showmenu
};
