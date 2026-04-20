# MCP Tools Specification

This document describes the MCP (Model Context Protocol) tools exposed by `toto-ms-supermarket` at the `/mcp` endpoint.

## Overview

The MCP endpoint allows AI agents (such as `agent-suppie`) to interact with the supermarket shopping list programmatically via the Model Context Protocol. All three tools are accessible at `POST /mcp`.

---

## Tools

### `getSupermarketListItems`

**Title**: Get supermarket list items

**Description**: Returns the current items in the user's main supermarket shopping list.

**Input**: none (empty object)

**Output**:
| Field | Type | Description |
| --- | --- | --- |
| `items` | `string[]` | Names of the items currently in the Main List |

**Functional behavior**:
- Reads the current Main List from MongoDB.
- Returns item names only (not full item objects).
- No side effects.

---

### `addItemsToSupermarketList`

**Title**: Add items to supermarket list

**Description**: Adds one or more items to the user's main supermarket shopping list.

**Input**:
| Field | Type | Description |
| --- | --- | --- |
| `items` | `string[]` | Names of items to add to the Main List |

**Output**:
| Field | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | `true` when all items have been persisted |

**Functional behavior**:
- Skips items already present in the list (case-insensitive name match).
- Persists new items to the Main List in MongoDB.
- Publishes an `item-added` event for each newly added item.
  - The event triggers downstream Location List sorting logic.

---

### `getCommonItems`

**Title**: Get common shopping items names

**Description**: Gets the names of the most commonly shopped items.

**Input**: none (empty object)

**Output**:
| Field | Type | Description |
| --- | --- | --- |
| `names` | `string[]` | Up to 300 distinct item names from archived lists |

**Functional behavior**:
- Scans archived shopping lists and returns up to 300 distinct item names.
- Used for autocomplete suggestions and as context for AI agents.
- No side effects.
