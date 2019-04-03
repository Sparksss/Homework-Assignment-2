/**
 * Request handlers
 *
 */

// Dependencies
var _data = require("./data");
var helpers = require("./helpers");
var config = require("./config");

// Define a handlers
var handlers = {};

// Users

handlers.users = function(data, callback) {
  var acceptebleMethods = ["post", "get", "put", "delete"];
  if (~acceptebleMethods.indexOf(data.method)) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// helps check is string
var checkIsString = function(str) {
  return typeof str == "string";
};

// helps check length greater than 0
var isGreaterThanZero = function(str) {
  return str.trim().length > 0;
};

// Container for users submethods
handlers._users = {};

// users post
// Required data: firstName, lastName, emai, streetAddress
// Optional data: none
handlers._users.post = function(data, callback) {
  // Check that all reqired fields are filled out
  var firstName =
    checkIsString(data.payload.firstName) &&
    isGreaterThanZero(data.payload.firstName)
      ? data.payload.firstName.trim()
      : false;

  var lastName =
    checkIsString(data.payload.lastName) &&
    isGreaterThanZero(data.payload.lastName)
      ? data.payload.lastName.trim()
      : false;

  var email =
    checkIsString(data.payload.email) &&
    data.payload.email.trim().length >= 10 &&
    data.payload.email.includes("@")
      ? data.payload.email.trim()
      : false;

  var password =
    checkIsString(data.payload.password) &&
    isGreaterThanZero(data.payload.password)
      ? data.payload.password.trim()
      : false;

  var streetAddress =
    checkIsString(data.payload.streetAddress) &&
    data.payload.streetAddress.trim().length > 10
      ? data.payload.streetAddress.trim()
      : false;

  if (firstName && lastName && email && password && streetAddress) {
    // Make sure that the user doesnt already exists
    _data.read("users", email, function(err, data) {
      if (err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        if (hashedPassword) {
          // Create the user object
          var userObject = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            hashedPassword: hashedPassword,
            streetAddress: streetAddress
          };

          // Store the user
          _data.create("users", email, userObject, function(err) {
            if (!err) {
              callback(200);
            } else {
              console.log(err);
              callback(500, { Error: "Could not create the new user" });
            }
          });
        } else {
          callback(500, { Error: "Could not hash the user's password" });
        }
      } else {
        // User already exist
        callback(400, { Error: "A user with that email already exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// users - get
// Required data: email
// Optional data: none
handlers._users.get = function(data, callback) {
  // Check that the email is valid
  var email =
    checkIsString(data.payload.email) && data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;
  if (email) {
    // Get the token from the headers
    var token = checkIsString(data.headers.token) ? data.headers.token : false;

    // Verify that the given token is the valid for the email
    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", email, function(err, data) {
          if (!err && data) {
            // Remover the hashed password from the user object before returning it to the requester
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "missing required field" });
  }
};

// users - put
// Reqired data: email
// Optional data: firstName, lastName, password(at least one must be specified), streetAddress
handlers._users.put = function(data, callback) {
  // Check for the reqired field
  var email =
    checkIsString(data.payload.email) &&
    data.payload.email.trim().length > 10 &&
    data.payload.email.includes("@")
      ? data.payload.email.trim()
      : false;

  // Check for the optional fields
  var firstName =
    checkIsString(data.payload.firstName) &&
    isGreaterThanZero(data.payload.firstName)
      ? data.payload.firstName.trim()
      : false;

  var lastName =
    checkIsString(data.payload.lastName) &&
    isGreaterThanZero(data.payload.lastName)
      ? data.payload.lastName.trim()
      : false;

  var password =
    checkIsString(data.payload.password) &&
    isGreaterThanZero(data.payload.password)
      ? data.payload.password.trim()
      : false;

  var streetAddress =
    checkIsString(data.payload.streetAddress) &&
    data.payload.streetAddress.trim().length > 5
      ? data.payload.streetAddress.trim()
      : false;

  // Error if the phone is invalid
  if (email) {
    // Error if nothing is sent to update
    if (firstName || lastName || password || streetAddress) {
      // Get the token from the headers
      var token = checkIsString(data.headers.token)
        ? data.headers.token
        : false;
      // Verify that the given token is the valid for the email
      handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the user
          _data.read("users", email, function(err, userData) {
            if (!err && userData) {
              // Update the fields neccesary
              if (firstName) {
                userData.firstName = firstName;
              }
              if (lastName) {
                userData.lastName = lastName;
              }
              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }
              if (streetAddress) {
                userData.streetAddress = streetAddress;
              }

              // Store the new updates
              _data.update("users", email, userData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header, or token is invalid"
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// users - delete
// Required field : phone
handlers._users.delete = function(data, callback) {
  // Check that the phone number is valid
  var email =
    checkIsString(data.queryStringObject.email) &&
    data.queryStringObject.email.trim().length > 10;
  data.queryStringObject.email.includes("@")
    ? data.queryStringObject.email.trim()
    : false;
  if (email) {
    // Get the token from the headers
    var token = checkIsString(data.headers.token) ? data.headers.token : false;
    // Verify that the given token is the valid for the email number
    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", email, function(err, data) {
          if (!err && data) {
            // Remover the hashed password from the user object before returning it to the requester
            _data.delete("users", email, function(err) {
              if (!err) {
                callback(200);
              } else {
                callback(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            callback(400, { Error: "Could not find specified user" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "missing required field" });
  }
};

// Tokens
handlers.tokens = function(data, callback) {
  var acceptebleMethods = ["post", "get", "put", "delete"];
  if (~acceptebleMethods.indexOf(data.method)) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none
handlers._tokens.post = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    data.payload.email.trim().length > 10 &&
    data.payload.email.includes("@")
      ? data.payload.email.trim()
      : false;

  var password =
    checkIsString(data.payload.password) &&
    isGreaterThanZero(data.payload.password)
      ? data.payload.password.trim()
      : false;
  if (email && password) {
    // Lookup the user who matches that email
    _data.read("users", email, function(err, userData) {
      if (!err && userData) {
        // Hash the send password and compare it to the password stored in the user object
        var hashedPassword = helpers.hash(password);
        if (hashedPassword == userData.hashedPassword) {
          // if valid, create a new token with a random name. Set expiration date 1 hour in the future
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() * 1000 * 60 * 60;
          var tokenObject = {
            email: email,
            id: tokenId,
            expires: expires
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, function(err) {
            if (!err) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: "Could not create a new token" });
            }
          });
        } else {
          callback(400, {
            Error: "Password did not match the specified user's stored password"
          });
        }
      } else {
        callback(400, { Error: "Could not find the specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field(s)" });
  }
};

// Tokens - get
// Reqiured data: id
// Optional data: none
handlers._tokens.get = function(data, callback) {
  // Check that the id is valid
  var id =
    checkIsString(data.queryStringObject.id) &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;
  if (id) {
    // Lookup the user
    _data.read("tokens", id, function(err, tokenData) {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: "missing required field" });
  }
};

// Tokens - put
// Reqiured data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback) {
  var id =
    checkIsString(data.payload.id) && data.payload.id.trim().length == 20
      ? data.payload.id.trim()
      : false;
  var extend =
    typeof data.payload.extend == "boolean" && data.payload.extend == true
      ? true
      : false;
  if (id && extend) {
    // Lookup the token
    _data.read("tokens", id, function(err, tokenData) {
      if (!err && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update("tokens", id, tokenData, function(err) {
            if (!err) {
              callback(200);
            } else {
              callback(500, {
                Error: "Could not update the token's expiration"
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token already expired, and cannot be extended"
          });
        }
      } else {
        callback(400, { Error: "specified token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing reqired field(s) or fields are invalid" });
  }
};

// Tokens - delete
// Reqiured data: id
// Optional data: none
handlers._tokens.delete = function(data, callback) {
  // Check that the id is valid
  var id =
    checkIsString(data.queryStringObject.id) &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the id
    _data.read("tokens", id, function(err, data) {
      if (!err && data) {
        _data.delete("tokens", id, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
        callback(200);
      } else {
        callback(400, { Error: "Could not find specified token" });
      }
    });
  } else {
    callback(400, { Error: "missing required field" });
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = function(id, email, callback) {
  // Lookup the token
  _data.read("tokens", id, function(err, tokenData) {
    if (!err) {
      // Check that token is for the given user and has not expired
      if (tokenData.email == email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Show menu for user
handlers.showmenu = function(data, callback) {
  if (data.method.toLowerCase() == "get") {
    handlers._showmenu.get(data, callback);
  } else {
    callback(405);
  }
};

// Container for showmenu
handlers._showmenu = {};

// This is handler for showing user of all menu items
// Required fields : email
// Optional data: none
handlers._showmenu.get = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    isGreaterThanZero(data.payload.email) &&
    data.payload.email.includes("@") &&
    data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;
  if (email) {
    // Get the token from the headers
    var token = checkIsString(data.headers.token) ? data.headers.token : false;

    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", email, function(err, userData) {
          if (!err) {
            var menuItems = {
              Starting: "You can do this actions",
              ProfileActions: {
                description: "This is actions of your profile",
                create: "You can create a new user for your friend",
                edit: "You can change your data",
                get: "You can get your data",
                delete: "You can delete own profile"
              },
              tokenActions: {
                description: "This is part of a tokens",
                create: "You can create a new token",
                edit: "You can edit a expires date for a token",
                get: "You can get information about a token",
                delete: "You can get a token"
              },
              orderActions: {
                description: "This is part of a orders",
                create: "You can create a new orders",
                edit: "You can edit your orders",
                get: "You can get information about your current order",
                delete: "You can delete your orders"
              },
              paymentActions: {
                description: "You can purchase you order"
              }
            };
            callback(200, menuItems);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Shoping cart
handlers.shoppingcart = function(data, callback) {
  var acceptebleMethods = ["post", "get", "put", "delete"];
  if (~acceptebleMethods.indexOf(data.method)) {
    handlers._shoppingcart[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all shoppingcart methods
handlers._shoppingcart = {};

// Shopping cart post
// Required data: email, tokenId, deliveryOrder, choosedProducts[], cost
// Optional data: none
handlers._shoppingcart.post = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    isGreaterThanZero(data.payload.email) &&
    data.payload.email.includes("@") &&
    data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;

  var deliveryOrder =
    checkIsString(data.payload.deliveryOrder) &&
    isGreaterThanZero(data.payload.deliveryOrder) &&
    data.payload.deliveryOrder.trim().length > 10
      ? data.payload.deliveryOrder.trim()
      : false;

  var choosedProducts =
    typeof data.payload.choosedProducts == "object" &&
    data.payload.choosedProducts instanceof Array &&
    data.payload.choosedProducts.length > 0
      ? data.payload.choosedProducts
      : false;

  var cost =
    typeof data.payload.cost == "number" && data.payload.cost !== 0
      ? data.payload.cost
      : false;

  if (email && deliveryOrder && choosedProducts && cost) {
    var token = checkIsString(data.headers.token) ? data.headers.token : false;

    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", email, function(err, userData) {
          if (!err && userData) {
            var orderId = helpers.createRandomString(20);
            var orderData = {
              orderId: orderId,
              emai: email,
              createOrderdate: Date.now(),
              deliveryOrder: deliveryOrder,
              choosedProducts: choosedProducts,
              amount: amount,
              purchased: false
            };

            // Create an order
            _data.create("orders", orderId, orderData, function(err) {
              if (!err) {
                callback(200);
              } else {
                console.log(err);
                callback(500, { Error: "Could not create a order" });
              }
            });
          } else {
            callback(404, { Error: "User with current email not found" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, {
      Error:
        "Missing required fields or you don't choose neither one product for delivery"
    });
  }
};

// Shopping cart get
// Required data: email, tokenId, orderId
// optional data: none
handlers._shoppingcart.get = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    isGreaterThanZero(data.payload.email) &&
    data.payload.email.includes("@") &&
    data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;

  var orderId =
    checkIsString(data.payload.orderId) &&
    data.payload.orderId.trim().length == 20
      ? data.payload.orderId.trim()
      : false;

  if (email && orderId) {
    var token = checkIsString(data.headers.token) ? data.headers.token : false;

    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the order
        _data.read("orders", orderId, function(err, orderData) {
          if (!err && orderData) {
            callback(200, orderData);
          } else {
            console.log(err);
            callback(500, { Error: "The order is doesn't exists" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Shopping cart put
// Required data: email, tokenId, orderId, cost
// optional data: deliveryOrder, choosedProducts (at least one must be specified)
handlers._shoppingcart.put = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    isGreaterThanZero(data.payload.email) &&
    data.payload.email.includes("@") &&
    data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;

  var orderId =
    checkIsString(data.payload.orderId) &&
    data.payload.orderId.trim().length == 20
      ? data.payload.orderId.trim()
      : false;

  var deliveryOrder =
    checkIsString(data.payload.deliveryOrder) &&
    isGreaterThanZero(data.payload.deliveryOrder) &&
    data.payload.deliveryOrder.trim().length > 10
      ? data.payload.deliveryOrder.trim()
      : false;

  var choosedProducts =
    typeof data.payload.choosedProducts == "object" &&
    data.payload.choosedProducts instanceof Array &&
    data.payload.choosedProducts.length > 0
      ? data.payload.choosedProducts
      : false;

  var amount =
    typeof data.payload.amount == "number" && data.payload.amount !== 0
      ? data.payload.amount
      : false;

  if (email && orderId && amount) {
    // Error if nothing is sent to update
    if (deliveryOrder || choosedProducts) {
      // Get the token from the headers
      var token = checkIsString(data.headers.token)
        ? data.headers.token
        : false;

      // Verify that the given token is the valid for the email
      handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
        if (tokenIsValid) {
          // Lookup the order
          _data.read("orders", orderId, function(err, orderData) {
            if (!err && orderData) {
              // Update the fields neccesary
              if (choosedProducts) {
                orderData.choosedProducts = choosedProducts;
              }
              if (deliveryOrder) {
                orderData.deliveryOrder = deliveryOrder;
              }

              orderData.amount = amount;

              // Store the new updates
              _data.update("orders", orderId, orderData, function(err) {
                if (!err) {
                  callback(200);
                } else {
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header, or token is invalid"
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Delete order
// Required data: email, tokenId, orderId
// Optional data: none
handlers._shoppingcart.delete = function(data, callback) {
  var email =
    checkIsString(data.payload.email) &&
    isGreaterThanZero(data.payload.email) &&
    data.payload.email.includes("@") &&
    data.payload.email.trim().length > 10
      ? data.payload.email.trim()
      : false;

  var orderId =
    checkIsString(data.payload.orderId) &&
    data.payload.orderId.trim().length == 20
      ? data.payload.orderId.trim()
      : false;

  if (email && orderId) {
    // Get the token from the headers
    var token = checkIsString(data.headers.token) ? data.headers.token : false;
    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the order
        _data.delete("orders", orderId, function(err) {
          if (!err) {
            callback(200);
          } else {
            callback(400, { Error: "The specified order does not exist" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

handlers.byingOrder = function(data, callback) {
  if (data.method.toLowerCase() == "get") {
    handlers._buyingOrder.get(data, callback);
  } else {
    callback(405);
  }
};

// Container for finish orders
handlers._buyingOrder = {};

// buyingOrder - get
// Required data: amount, orderId, token
// Optional data: none
handlers._buyingOrder.get = function(data, callback) {
  var amount =
    typeof data.payload.amount == "number" && data.payload.amount > 0
      ? data.payload.amount
      : false;

  var orderId =
    checkIsString(data.payload.orderId) &&
    data.payload.orderId.trim().length == 20
      ? data.payload.orderId.trim()
      : false;

  if (amount && orderId) {
    var token = checkIsString(data.headers.token) ? data.headers.token : false;

    handlers._tokens.verifyToken(token, email, function(tokenIsValid) {
      if (tokenIsValid) {
        // Lookup the order
        _data.read("orders", orderId, function(err, orderData) {
          if (!err && orderData) {

            // Started paiying
            helpers.stripePay(orderData.amount, "delivery pizza", function(err) {
              if (!err) {
                orderData.purchased = true;
                // Save success purchased
                _data.update("orders", orderId, orderData, function(err) {
                  if (!err) {
                    callback(200, orderData);
                  }else {
                    callback();
                  }
                });
              } else {
                console.log(data);
                callback(data.status, {Error: "Something went wrong with payment"});
              }
            });
          } else {
            console.log(err);
            callback(500, { Error: "The order is doesn't exists" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid"
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Ping handlers
handlers.ping = function(data, callback) {
  callback(200);
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

// Export the module
module.exports = handlers;
