# toto-ms-supermarket — Desired Behavior Specification

This document describes the desired behavior of the `toto-ms-supermarket` microservice.

## Overview

`toto-ms-supermarket` is a REST API that manages the user's supermarket shopping list. It is the single source of truth for all shopping list data and exposes both HTTP endpoints and MCP tools for AI agent integration.

## Core Concepts

- **Main List**: The editable, global shopping list. Items are added, updated, and deleted here.
- **Location List**: A sorted shopping list for a specific supermarket location (a shopping session).
- **Supermarket (Location)**: A configured supermarket where the user shops. Each supermarket has its own Location List.
- **Common Items (Names)**: A list of distinct item names extracted from past archived shopping lists, used for autocomplete and AI-assisted item recognition.

## HTTP API Behavior

### Main List

| Method | Path | Behavior |
|--------|------|----------|
| `GET /list/items` | Returns all items currently in the Main List. |
| `POST /list/items` | Adds a single item to the Main List. Publishes an `item-added` event that triggers Location List sorting. Requires `Authorization` header. Returns the new item's `id`. |
| `PUT /list/items/:id` | Updates an existing item in the Main List. |
| `DELETE /list/items/:id` | Deletes an item from the Main List. Publishes an `item-deleted` event that removes the item from all Location Lists. |

### Supermarkets and Location Lists

| Method | Path | Behavior |
|--------|------|----------|
| `GET /supermarkets` | Returns the list of configured supermarket locations. |
| `GET /supermarkets/:id/items` | Returns the Location List (sorted items) for a specific supermarket. |
| `PUT /supermarkets/:sid/items/:id/tick` | Ticks or unticks an item in a Location List. When the last item is ticked, a `location-list-closed` event is published. |
| `POST /supermarkets/:sid/close` | Closes a Location List early. Unticked items are returned to the Main List. Requires `Authorization` header. |

### Names and Predictions

| Method | Path | Behavior |
|--------|------|----------|
| `GET /names` | Returns up to 300 distinct common item names from archived lists. Used for autocomplete and as a reference dictionary for AI agents. |
| `GET /predictions/nesu` | Returns the predicted number of days until the next grocery trip. |

### Preferences

| Method | Path | Behavior |
|--------|------|----------|
| `GET /preferences` | Returns the user's preferences. |
| `POST /preferences` | Sets the user's preferences. |

### Games (Training Data Collection)

| Method | Path | Behavior |
|--------|------|----------|
| `POST /games/sort/examples` | Saves a training example for item ordering. |
| `GET /games/sort/next` | Returns a random pair of items for the next training round. |

### Operations

| Method | Path | Behavior |
|--------|------|----------|
| `POST /backup` | Triggers a MongoDB backup to Google Cloud Storage. Deletes backups older than 2 days. |
| `POST /events` | Pub/Sub webhook for internal domain events (`item-added`, `item-deleted`, `location-list-closed`). |

## MCP Tools (for AI Agent Integration)

The API exposes the following tools via its MCP endpoint (`/mcp`) so that AI agents (e.g. `agent-suppie`) can interact with the shopping list programmatically:

### `addItemsToSupermarketList`
- **Description**: Adds multiple items to the user's Main List in bulk.
- **Input**: A list of item names (strings).
- **Behavior**: Persists all items to the Main List and publishes `item-added` events for each, triggering Location List sorting.
- **Output**: Success confirmation.

### `getSupermarketListItems`
- **Description**: Returns the current items in the user's Main List.
- **Input**: None.
- **Behavior**: Reads all items from the Main List.
- **Output**: A list of item names (strings).

### `getCommonItems`
- **Description**: Returns a list of common supermarket item names from past archived lists.
- **Input**: None.
- **Behavior**: Scans archived lists and returns up to 300 distinct item names.
- **Output**: A list of item names (strings).

## Event-Driven Behavior

The service uses a Pub/Sub message bus (topic: `supermarket`) for internal orchestration:

- **`item-added`**: When an item is added to the Main List, the event triggers adding and sorting the item into each Location List using the ML sorting model.
- **`item-deleted`**: When an item is deleted from the Main List, it is removed from all Location Lists.
- **`location-list-closed`**: When a Location List is closed (all items ticked or manually closed), the list is archived, all Location Lists are cleared, the Main List is emptied, and any unticked items are re-added to the Main List.

## Data Storage

- **Database**: MongoDB (database name: `supermarket`)
- **Collections**: `items` (Main List), `locationLists`, `archivedLists`, `trainingExamples`, `settings`

## Authentication

- Uses Toto auth provider.
- `POST /list/items` and `POST /supermarkets/:sid/close` require a Bearer token in the `Authorization` header.
- The auth token is propagated to downstream event handlers for item re-insertion on list close.
