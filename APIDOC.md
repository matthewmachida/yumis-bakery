# Yumi's Bakery API Documentation
The API that provided functionality for ordering various desserts from Yumi's Bakery.
Contains information about the desserts offered for purchase and provides endpoints
that allow users to purchase items when logged in.

## Get All Available Desserts

**Request Format:** /getDesserts

**Query Parameters:** `dessert` (optional)

**Request Type:** GET

**Returned Data Format:** JSON

**Description:** Given the name of a dessert, will return information regarding that dessert in JSON format. This information will include the food name, its id, a photo, flavor options, pricing, and max amount per purchase. Pricing will always be per 1 unit. If no dessert name is passed in, returns a list of all desserts available for purchase. Contains the dessert name and a photo file name.

**Example Request 1:** /getDesserts

**Example Response 1:**

```json
[
  {
    "name": "Cookies",
    "img": "cookies.png"
  },
  {
    "name": "Donuts",
    "img": "donut.png"
  },
  {
    "name": "Cake",
    "img": "cake5.png"
  },
  {
    "name": "Cheesecake",
    "img": "cheesecake1.png"
  }
]
```

**Example Request 2:** /getDesserts?dessert=Donuts

**Example Response 2**:

```json
{
  "name": "Donuts",
  "img": "donut.png",
  "flavors": [
    {
      "flavor": "Classic Glazed",
      "price": "3.50"
    },
    {
      "flavor": "Strawberry",
      "price": "3.50"
    },
    {
      "flavor": "Black Sesame",
      "price": "3.50"
    },
    {
      "flavor": "Matcha",
      "price": "3.50"
    }
  ],
  "max": "6"
}
```

**Error Handling:**

Error 400: Invalid request was made. The given dessert could not be found.

Error 500: Set if there is an error reading the dessert info on the server side


## Search Available Desserts

**Request Format:** /search

**Query Parameters:** `input` (optional), which is a string value, and also `large` `small` and `customizable` (all optional), which are all boolean values. Each filter parameter defaults to `0` (representing `false`) if not included.

**Request Type:** GET

**Returned Data Format:** JSON

**Description:** Given either a text query and a filter, will return a list of items that match all the provided filters. If a text query is provided, then only the text query is applied and the other filters are ignored.

Filters may include: small, large, and/or customizable

If any of the filters are set to `1`, then they are "activated" and will filter accordibly. Otherwise, no filter is applied in respect to that attribute.

**Example Request 1:** `/search?large=1&customizable=1`

With the POST body with the following parameters: `large=1`, `customizable=1`

**Example Response 1:**

```json
[
  {
    "name": "Cake",
    "img": "cake3.png"
  },
  {
    "name": "Cheesecake",
    "img": "cheesecake1.png"
  }
]
```

**Example Request 2:** `/search?input=cooki&large=1`

**Example Response 2:**

```json
[
  {
    "name": "Cookies",
    "img": "cookies.png"
  },
]
```

**Error Handling:**

Error 400: Invalid request was made. Means the POST body parameters were given invalid values.

Error 500: Set if there is an error reading the dessert info on the server side


## Create User

**Request Format:** /newuser

With POST parameters `username`, `password`, and `email`

**Request Type:** POST

**Returned Data Format:** Plain text

**Description:** Given a username, password, and email, will create a new account with the given credentials. Will send back text saying "Account created for user" if sucessful, and will send an error code otherwise.

**Example Request:** /login

With POST parameters

`username=yumi-admin`, `password=ilovebaking123`, and `email=yumi-admit@yumisbakery.com`

**Example Response:**

```
Account created for yumi-admin
```

**Error Handling:**

Error 400: Invalid request was made. Some parameter was not submitted through POST

Error 450: Either the username or email submitted is already in use by another account

Error 500: There was an error while checking credentials on the server side. Try again later



## Log In User

**Request Format:** /login

With POST parameters `username` and `password`

**Request Type:** POST

**Returned Data Format:** Plain text

**Description:** Given a username and a password, will log the user into the account if credentials match correctly. Will send back text saying "user sucessfully logged in" if logged in, and will send back an error code otherwise.

**Example Request:** /login

With POST parameters

`username=yumi-admin` and `password=ilovebaking123`

**Example Response:**

```
yumi-admin logged in sucessfully
```

**Error Handling:**

Error 400: Invalid request was made. Either a username or a password was not submitted

Error 410: Either the username or password were incorrect or did not exist (the login failed)

Error 500: There was an error while checking credentials on the server side. Try again later


## Make Purchase

**Request Format:** /purchase

With POST parameters `username` and `cart`

**Request Type:** POST

**Returned Data Format:** JSON

**Description:** Allows user to make a purchase after selecting the items they want to buy, including the quantity of each item they want to purchase, any special modifications, and the final total price.

**Example Request:** /purchase

With POST parameters

`username=guest`

This stringified JSON object:
```javascript
cart = JSON.stringify([
  {
    "item": "cookies-chocolatechip",
    "quantity": 4,
    "modifications": null
  },
  {
    "item": "cake-tiramisu",
    "quantity": 1,
    "modifications": "happy birthday message for Maddie with white frosting!"
  }
]);
```

**Example Response:**

```json
{
  "username": "mmachida",
  "transaction_id": "6",
  "items": [
    {
      "item": "cookies-chocolatechip",
      "quantity": 4,
      "modifications": null
    },
    {
      "item": "cake-tiramisu",
      "quantity": 1,
      "modifications": "happy birthday message for Maddie with white frosting!"
    }
  ],
  "total_cost": 43.00
}

```

**Error Handling:**

Error 420: The user was not logged in

Error 430: The cart is empty, so nothing can be purchaced

Error 440: There is at least 1 item that is either out of stock or does not have enough in stock to satisfy the user's order

Error 500: See if there was an error in completing a transaction


## Get Cart/Purchase History

**Request Format:** /cart/:username

**Request Type:** GET

**Returned Data Format:** JSON

**Description:** Gets all the ordered items previously placed by the specified user

**Example Request:** /cart/:mmachida

**Example Response:**

```json
[
  {
    "transaction_id": 1,
    "items": [
      {
        "transaction_id": 1,
        "item_id": "donuts-strawberry",
        "quantity": 6,
        "modifications": null,
        "price": 3.5
      },
      {
        "transaction_id": 1,
        "item_id": "donuts-blacksesame",
        "quantity": 6,
        "modifications": null,
        "price": 3.5
      },
      {
        "transaction_id": 1,
        "item_id": "donuts-matcha",
        "quantity": 6,
        "modifications": null,
        "price": 3.5
      },
      {
        "transaction_id": 1,
        "item_id": "cheesecake-matcha",
        "quantity": 1,
        "modifications": "n/a",
        "price": 30
      }
    ],
    "total_cost": 93
  },
  {
    "transaction_id": 5,
    "items": [
      {
        "transaction_id": 5,
        "item_id": "cookies-chocolatechip",
        "quantity": 4,
        "modifications": null,
        "price": 2
      },
      {
        "transaction_id": 5,
        "item_id": "cake-tiramisu",
        "quantity": 1,
        "modifications": "happy birthday message for Maddie with white frosting!",
        "price": 35
      }
    ],
    "total_cost": 43
  }
]
```

**Error Handling:**

Error 420: The user was not logged in

Error 500: See if there was an error in looking up the items that were purchased