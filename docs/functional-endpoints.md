# Supermarket API — Functional Endpoint Guide

This document explains the functional behavior of the `toto-ms-supermarket` microservice. It focuses on what each endpoint does from a business perspective (shopping list, location lists, shopping session, and training data).

## Core concepts (quick recap)
- **Main List**: The editable, global shopping list.
- **Location List**: A sorted list for a specific supermarket (shopping session).
- **Supermarket**: A shopping location used to generate a Location List.

## Endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | [GET /list/items](#get-listitems) | Read the current Main List items |
| POST | [POST /list/items](#post-listitems) | Add a new item to the Main List |
| PUT | [PUT /list/items/:id](#put-listitemsid) | Update an item in the Main List |
| DELETE | [DELETE /list/items/:id](#delete-listitemsid) | Remove an item from the Main List |
| GET | [GET /supermarkets](#get-supermarkets) | List configured supermarkets |
| GET | [GET /supermarkets/:id/items](#get-supermarketsiditems) | Get Location List items for a supermarket |
| PUT | [PUT /supermarkets/:sid/items/:id/tick](#put-supermarketssiditemsidtick) | Tick/untick an item in a Location List |
| POST | [POST /supermarkets/:sid/close](#post-supermarketssidclose) | Close a Location List early and re-add unticked items |
| GET | [GET /names](#get-names) | Return common item names (autocomplete/training) |
| GET | [GET /predictions/nesu](#get-predictionsnesu) | Predict days until next grocery trip |
| POST | [POST /games/sort/examples](#post-gamessortexamples) | Save a training example for item ordering |
| GET | [GET /games/sort/next](#get-gamessortnext) | Fetch the next training round (two items) |
| POST | [POST /backup](#post-backup) | Backup MongoDB collections to GCS |
| POST | [POST /events](#post-events) | Pub/Sub hook for internal domain events |

---

## Main List endpoints

### GET /list/items
Returns the current items in the Main List.

**Functional behavior**
- Reads the list from MongoDB.
- Returns the items as stored (no side effects).

**Response**
- `items`: array of list items.

### POST /list/items
Adds a new item to the Main List.

**Functional behavior**
- Persists the item into the Main List.
- Publishes an `item-added` event with the item payload and the auth token.
  - This event triggers downstream logic that creates/sorts Location List items.

**Inputs**
- Body: item payload (as a list item object).
- Authorization header: `Bearer <token>` (required).

**Response**
- `id`: id of the newly created item.

### PUT /list/items/:id
Updates an existing item in the Main List.

**Functional behavior**
- Persists the updated item fields in MongoDB.
- No events are published here.

**Inputs**
- Path param: `id` (item id).
- Body: updated list item payload.

**Response**
- `updated: true` when the update succeeds.

### DELETE /list/items/:id
Deletes an item from the Main List.

**Functional behavior**
- Removes the item from MongoDB.
- Publishes an `item-deleted` event.
  - This event removes the item from all Location Lists.

**Inputs**
- Path param: `id` (item id).

**Response**
- `deleted: true` when the delete succeeds.

---

## Supermarket + Location List endpoints

### GET /supermarkets
Returns the list of configured supermarkets.

**Functional behavior**
- Reads the static supermarket catalog from the in-memory store.

**Response**
- `{ supermarkets: [...] }` (shape determined by the supermarket catalog).

### GET /supermarkets/:id/items
Returns the Location List for a specific supermarket.

**Functional behavior**
- Retrieves the supermarket by id.
- Fetches the list of items for that supermarket's Location List.

**Inputs**
- Path param: `id` (supermarket id).

**Response**
- `items`: array of location list items.

### PUT /supermarkets/:sid/items/:id/tick
Ticks or unticks a Location List item.

**Functional behavior**
- Updates the item `ticked` status.
- Computes and persists `userIndex` (ordering preference signal).
- When the last unticked item is ticked, publishes a `location-list-closed` event.

**Inputs**
- Path params: `sid` (supermarket id), `id` (item id).
- Body: `{ ticked: boolean }`.

**Response**
- `ticked`: boolean
- `assignedUserIndex`: number (computed ordering index)
- Plus any additional fields returned by the update operation.

### POST /supermarkets/:sid/close
Closes a Location List early (when shopping is stopped before all items are ticked).

**Functional behavior**
- Extracts all unticked items from the Location List.
- Removes those unticked items from the Location List.
- Publishes a `location-list-closed` event with the unticked items and auth token.
  - Downstream processing archives the closed list, clears the Main List, and re-adds unticked items to the Main List.

**Inputs**
- Path param: `sid` (supermarket id).
- Authorization header: `Bearer <token>` (required).

**Response**
- `untickedItems`: array of items returned to the Main List.

---

## Names + predictions

### GET /names
Returns a list of common item names.

**Functional behavior**
- Scans archived lists and returns distinct item names (up to 300).
- Used for autocomplete and training dictionary.

**Response**
- `names`: array of strings.

### GET /predictions/nesu
Predicts how many days remain until the next grocery trip.

**Functional behavior**
- Placeholder implementation currently returns a static value.

**Response**
- `predictedDays`: number of days from today.

---

## Games (training data collection)

### POST /games/sort/examples
Saves a training example for item ordering.

**Functional behavior**
- Persists a labeled pair of items and their preferred order.

**Inputs**
- Body: training example payload.

**Response**
- `id`: stored example id.

### GET /games/sort/next
Returns a new training round.

**Functional behavior**
- Randomly samples two items from archived lists.
- If two samples are not available, returns an empty object.

**Response**
- `{ item1: string, item2: string }` or `{}` when not enough data.

---

## Operations & integrations

### POST /backup
Triggers a MongoDB backup and uploads it to Google Cloud Storage.

**Functional behavior**
- Iterates through all configured collections.
- Writes one file per collection and uploads to the `BACKUP_BUCKET`.
- Deletes backups older than 2 days.

**Response**
- `backup: "done"`.

### POST /events
Receives Pub/Sub events for internal orchestration.

**Functional behavior**
- Expects a Pub/Sub-style payload with `message.data` (base64-encoded JSON).
- Dispatches the event to internal handlers:
  - `item-added`: adds and sorts location list entries.
  - `item-deleted`: removes the item from all location lists.
  - `location-list-closed`: archives the list, clears lists, and re-adds unticked items to the Main List.

**Response**
- `processed: true` when the message is accepted.

---

## Notes on authentication
Two endpoints require an auth token in the `Authorization` header:
- `POST /list/items`
- `POST /supermarkets/:sid/close`

The token is passed along to downstream processes to allow re-insertion of items when a list is closed.