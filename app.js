/**
 * Matthew Machida (mmachida)
 * Ralen Kovara (ralenk)
 *
 * The Javascript file for the server side of Yumi's Bakery. Implements the endpoints
 * provided by Yumi's Bakery, which allows users to retrieve information about desserts,
 * log into accounts, and place orders.
 */

"use strict";

const express = require('express');
const multer = require("multer");
const app = express();
const sqlite3 = require('sqlite3');
const {open} = require('sqlite');

// for application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // built-in middleware
// for application/json
app.use(express.json()); // built-in middleware
// for multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

// App constants
const DEFAULT_PORT = 8000;
const SUCCESS_CODE = 200;
const NOT_FOUND_ERROR = 400;
const BAD_LOGIN_ERROR = 410;
const LOGGED_OUT_ERROR = 420;
const EMPTY_CART_ERROR = 430;
const OUT_OF_STOCK_ERROR = 440;
const INFO_TAKEN_ERROR = 450;
const SERVER_ERROR_READ = 500;

const NOT_FOUND_MSG = "We could not find that item! Try a diffierent item";
const BAD_LOGIN_MSG = "The login was not sucessful. Either the username or password were incorrect";
const LOGGED_OUT_MSG = "You are not logged in. Please login and try again";
const EMPTY_CART_MSG = "The cart is empty. Please add some items to the cart before purchasing";
const OUT_OF_STOCK_MSG = "There is not enough of items in stock to complete this purchase";
const INFO_TAKEN_MSG = "The submitted username or email is already in use. Please choose something else"
const SERVER_FAIL_MSG = "There was an error reading info from the server. Try again later";

/**
 * Sends back JSON containing information about the specified dessert. Sends back
 * a 400 level error if the dessert does not exist in the database and a 500 level
 * error for database reading issues. If no dessert is passed in, then send ends
 * back a list of JSON items with information of all desserts stored. Sends a
 * 500 level error if there are issues while reading from the database
 */
app.get("/getDesserts", async (req, res) => {
  try {
    const dessert = req.query.dessert; // may be null!
    let db = await getDBConnection();
    let results = [];
    if (dessert !== undefined) { // query exists
      const query = "SELECT a.name, a.flavor, a.price, a.stock, b.img, b.max" +
          "  FROM itemflavors a, iteminfo b WHERE a.name=? AND b.name = a.name;";
      let info = await db.all(query, dessert);
      results = parseDessertInfo(info);
    } else { // does not exist
      results = await db.all("SELECT name, img FROM iteminfo;");
    }
    await db.close();
    if (results.length === 0) { // If empty, then dessert doesn't exist
      res.status(NOT_FOUND_ERROR)
        .type("text")
        .send(NOT_FOUND_MSG);
    } else {
      res.status(SUCCESS_CODE).json(results);
    }
  } catch (err) {
    res.status(SERVER_ERROR_READ)
      .type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Takes all items of a certain dessert type from the database and condenses it into
 * a format to send back to the user. The returned object contains essential information
 * about the dessert info with a list of its flavors
 * @param {Array} info An array of each item (of different flavors) that are the same
 *                     kind of dessert. Assumes all items of the same type will have the
 *                     same metadata, including image, price, and max value.
 * @returns {Object} The returned Object with the provided data
 */
function parseDessertInfo(info) {
  let data = {
    name: info[0]["name"],
    img: info[0]["img"],
    flavors: [],
    max: info[0]["max"]
  };
  for (let i = 0; i < info.length; i++) {
    let item = {
      "flavor": info[i]["flavor"],
      "price": info[i]["price"]
    };
    data["flavors"].push(item);
  }
  return data;
}

/**
 * Searches for items with the text input from the user, or with filters if no text
 * was provided. Both text input and filters are passed in as query parameters. If
 * filters are not included in the query, they are not applied. Sends back a list of
 * JSON items of all items that match the filters. Sends back a 400 level error if
 * the POST body parameters are invalid and a 500 level error for database reading
 * issues.
 */
app.get("/search", async (req, res) => {
  try {
    let db = await getDBConnection();
    let result;
    if (req.query.input !== undefined) {
      const query = "SELECT name, img FROM iteminfo WHERE name LIKE ?;";
      result = await db.all(query, "%" + req.query.input + "%");
    } else {

      // Check query parameters and default to false if it was not given
      let small = (req.query.small !== undefined) ? req.query.small : 0;
      let large = (req.query.large !== undefined) ? req.query.large : 0;
      let query = "SELECT name, img FROM iteminfo WHERE small=? AND large=?;";
      if (req.query.customizable !== undefined) {
        query += " AND customizable=?;";
        result = await db.all(query, small, large, req.query.customizable);
      } else {
        query += ";";
        result = await db.all(query, small, large);
      }
    }
    await db.close();
    res.status(SUCCESS_CODE).json(result);
  } catch (err) {
    res.status(SERVER_ERROR_READ).type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Creates a new account using the information given in the POST body. This user will
 * be logged out by default, so the user must log in right after creationg. If the username
 * or the email already exist, or if any of the required information is not included,
 * then a 400 level error is thrown. A 500 level error is thrown if there was an error
 * creating the account on the server's side.
 */
app.post("/newuser", async (req, res) => {
  try {
    if (!req.body.username || !req.body.password || !req.body.email) {
      res.status(NOT_FOUND_ERROR).type("text")
        .send(NOT_FOUND_MSG);
    } else {
      if (await ifDataExists(req.body.username, req.body.email)) {
        res.status(INFO_TAKEN_ERROR).type("text")
          .send(INFO_TAKEN_MSG);
      } else {
        let db = await getDBConnection();
        const query = "INSERT INTO users (username, password, email, loggedin) VALUES (?, ?, ?, ?)";
        await db.run(query, req.body.username, req.body.password, req.body.email, 0);
        await db.close();
        res.status(SUCCESS_CODE).type("text")
            .send("Account created for " + req.body.username);
      }
    }
  } catch (err) {
    res.status(SERVER_ERROR_READ).type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Checks whether the given user information already exists for a user in
 * the bakery database
 * @param {string} username The username to check
 * @param {string} email The email to check
 * @returns {Promise} True if either the username or email exist already.
 *                    False otherwise
 */
async function ifDataExists(username, email) {
  let db = await getDBConnection();
  let res = await db.get("SELECT * FROM users WHERE username=?", username);
  if (res) {
    return true;
  }
  res = await db.get("SELECT * FROM users WHERE email=?", email);
  if (res) {
    return true;
  }
  return false;
}

/**
 * Logs in the user into the account with the credentials sent through the POST body.
 * Sends back a 400 level error indicating if the credentials do not match and a 500
 * level error if there was an error logging in from the server's side.
 */
app.post("/login", async (req, res) => {
  try {
    if (!req.body.username || !req.body.password) {
      res.status(NOT_FOUND_ERROR)
        .type("text")
        .send(NOT_FOUND_MSG);
    } else {
      let db = await getDBConnection();
      const query = "SELECT * FROM users WHERE username=?;";
      let result = await db.all(query, req.body.username);
      if (result.length === 0 || result[0]["password"] !== req.body.password) { // check credentials
        await db.close();
        res.status(BAD_LOGIN_ERROR)
          .type("text")
          .send(BAD_LOGIN_MSG);
      } else {
        await db.run("UPDATE users SET loggedin=1 WHERE username=?;", req.body.username); // login
        await db.close();
        res.status(SUCCESS_CODE).type("text")
          .send(req.body.username + " logged in sucessfully");
      }
    }
  } catch (err) {
    res.status(SERVER_ERROR_READ).type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Completes a purchase consisting of the items the user has selected and sent through
 * the POST body. Will throw a 400 level error if either the username or cart parameters
 * are not provided, if the user is not logged in, if the cart is empty, or if there are
 * not enough items in stock to complete the transaction. Will throw a 500 level error if
 * there are any issues communicating with the server database.
 */
app.post("/purchase", async (req, res) => {
  try {
    if (!req.body.username || !req.body.cart) {
      res.status(NOT_FOUND_ERROR).type("text")
        .send(NOT_FOUND_MSG);
    } else if (!(await isLoggedIn(req.body.username))) {
      res.status(LOGGED_OUT_ERROR).type("text")
        .send(LOGGED_OUT_MSG);
    } else {
      const items = JSON.parse(req.body.cart); // parse the user input into an object again
      if (items.length === 0) { // if there is nothing, then the cart must be empty
        res.status(EMPTY_CART_ERROR).type("text")
          .send(EMPTY_CART_MSG);
      } else {
        let everythingInStock = await isInStock(items);
        if (everythingInStock) {
          let response = await addTransaction(req.body.username, items); // add items to database
          res.status(SUCCESS_CODE).json(response);
        } else {
          res.status(OUT_OF_STOCK_ERROR).type("text")
            .send(OUT_OF_STOCK_MSG);
        }
      }
    }
  } catch (err) {
    res.status(SERVER_ERROR_READ).type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Checks if the items in the array are in stock
 * @param {Array} items The array of items to check
 * @returns {Promise} True if everything is in stock. False otherwise.
 */
async function isInStock(items) {
  let db = await getDBConnection();
  let everythingInStock = true;

  // check if there is enough before removing everything
  for (let i = 0; i < items.length; i++) {
    const query = "SELECT stock FROM itemflavors WHERE id=?;";
    const thisItem = items[i]["item"];
    let inStock = await db.get(query, thisItem);
    if (items[i]["quantity"] > inStock) {
      everythingInStock = false;
    }
  }
  await db.close();
  return everythingInStock;
}

/**
 * Given a username and a list of items to purchase, adds all the items to the bakery
 * database under the given username with a new transaction id. The response will contain
 * the new transaction id as well as the items purchased and the total price.
 * @param {string} username The username of the user completing the purchase
 * @param {Array} items An array of items to purchase
 * @returns {Object} The response object containing information about the completed
 *                   transaction
 */
async function addTransaction(username, items) {
  console.log(2);
  let db = await getDBConnection();
  const addEntryQuery = 'INSERT INTO history (username) VALUES (?)';
  console.log(username);
  await db.run(addEntryQuery, username);
  console.log(3);
  const getTransIDQuery = "SELECT transaction_id FROM history ORDER BY transaction_id DESC";
  let newTransID = await db.get(getTransIDQuery);
  console.log(1);
  let response = {
    "username": username,
    "transaction_id": newTransID["transaction_id"],
    "items": [],
    "total_cost": 0.0
  };
  for (let i = 0; i < items.length; i++) {
    const getPriceQuery = "SELECT price FROM itemflavors WHERE id=?";
    let price = await db.get(getPriceQuery, items[i]["item"]);
    response["items"].push(items[i]);
    response["total_cost"] += (price["price"] * items[i]["quantity"]);
    const fields = "(transaction_id, item_id, quantity, modifications)";
    const addItemQuery = "INSERT INTO itemhistory " + fields + " VALUES (?, ?, ?, ?)";
    await db.run(
      addItemQuery,
      newTransID["transaction_id"],
      items[i]["item"],
      items[i]["quantity"],
      items[i]["modifications"]
    );
  }
  await reduceStock(items);
  await db.close();
  return response;
}

/**
 * Given an array of items, reduces the stock in the database by the amount present
 * @param {Promise} items The array of items
 */
async function reduceStock(items) {
  let db = await getDBConnection();
  const query = "UPDATE itemflavors SET stock=stock-? WHERE id=?;";
  for (let i = 0; i < items.length; i++) {
    await db.run(query, items[i]["quantity"], items[i]["item"]);
  }
  await db.close();
}

/**
 * Sends back all purchases that the user has made before. Sends back a
 * 400 level error if the user is not logged in and a 500 level error if
 * there are database issues.
 */
app.get("/cart/:username", async (req, res) => {
  try {
    if ((await isLoggedIn(req.params.username))) {
      let db = await getDBConnection();
      const query = "SELECT * FROM history WHERE username=?;";
      let transactions = await db.all(query, req.params.username); // list of all transactions
      let result = await populatePurchaceHistory(transactions); // find details about each purchase
      await db.close();
      res.status(SUCCESS_CODE).json(result);
    } else {
      res.status(LOGGED_OUT_ERROR).type("text")
        .send(LOGGED_OUT_MSG);
    }
  } catch (err) {
    res.status(SERVER_ERROR_READ).type("text")
      .send(SERVER_FAIL_MSG);
  }
});

/**
 * Given an array of transaction_id's, produces transaction summaries for each
 * transaction which includes item names, quantities, and any modifications to
 * the items, for each transaction. Will return an array of all transactions.
 * @param {Array} transactions An array of all the items purchaced within a single
 *                             transaction.
 * @returns {Promise} An array of transaction summaries
 */
async function populatePurchaceHistory(transactions) {
  let summaries = [];
  let db = await getDBConnection();
  if (transactions.length > 0) {
    let query = "SELECT a.*, b.price FROM itemhistory a, itemflavors b";
    query += " WHERE a.transaction_id=? AND a.item_id=b.id";
    for (let i = 0; i < transactions.length; i++) {
      let result = await db.all(query, transactions[i]["transaction_id"]);
      if (result.length > 0) {
        let summary = {
          "transaction_id": result[0]["transaction_id"],
          "items": [],
          "total_cost": 0.0
        };
  
        // We have the transaction info, now go through every item in the transaction
        for (let j = 0; j < result.length; j++) {
          summary["items"].push(result[j]);
          summary["total_cost"] += (result[j]["price"] * result[j]["quantity"]);
        }
        summaries.push(summary);
      }
    }
  }
  await db.close();
  return summaries;
}

/**
 * Function for lecture: establishes a connection to the bakery.db database
 * @returns {Database} A connection to the bakery.db database
 */
async function getDBConnection() {
  const db = await open({
    filename: "bakery.db",
    driver: sqlite3.Database
  });
  return db;
}

/**
 * Checks if the user is logged in, according to the server
 * @param {string} username The username of the user to check
 * @returns {Promise} True if the user is logged in. False otherwise,
 *                    including if there is a database reading error.
 */
async function isLoggedIn(username) {
  try {
    let db = await getDBConnection();
    const userQuery = "SELECT username, loggedin FROM users WHERE username=?";
    let response = await db.get(userQuery, username);
    await db.close();
    if (response.length === 0) {
      return false;
    }
    return (response["loggedin"] === 1);
  } catch (err) {
    return false;
  }
}

// Listening on specified or default port
const PORT = process.env.PORT || DEFAULT_PORT;
app.listen(PORT);

// tells the code to serve static files in a directory called 'public'
app.use(express.static('public'));