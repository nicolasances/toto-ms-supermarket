# Toto Supermarket

This service manages everything related to grocery shopping. It is the backbone of the **Toto Suppie** app, which helps users build and execute grocery shopping lists across multiple supermarkets.

---

## Table of Contents

1. [Core Concepts](#1-core-concepts)
2. [How the Concepts Connect](#2-how-the-concepts-connect)
3. [Scenarios](#3-scenarios)
   - [Adding an item to the list](#31-adding-an-item-to-the-list)
   - [Executing a shopping session](#32-executing-a-shopping-session)

---

## 1. Core Concepts

### The Main List

The **Main List** is the central grocery shopping list. It is a single, shared list where the user accumulates all the items they need to buy. Items can be added at any time — before or even during shopping. The Main List is the source of truth for *what* needs to be bought.

Each item on the Main List simply has a **name** and a **ticked** status (whether it has been picked up or not).

### Supermarkets

A **Supermarket** is a physical store where the user goes shopping. The service knows about a fixed set of supermarkets (e.g. Super Brugsen, Lidl, Føtex), each identified by a name and a geographic location.

### Location Lists

A **Location List** is a version of the Main List tailored to a specific supermarket. Every item on the Main List automatically gets a corresponding entry in the Location List of every configured supermarket.

The key difference from the Main List is that items in a Location List are **sorted in the order you would physically encounter them in that specific store** — mimicking the natural aisle-by-aisle flow of shopping. This predicted order is learned over time from the user's own shopping history.

Each item in a Location List also tracks:
- Whether it has been **ticked** (picked up) during the current shopping session.
- The **order in which the user actually picked it up** (used to improve future sorting).

### The Archive

When a shopping session ends, all the data from that session — which items were bought, at which supermarket, and in what order they were actually picked up — is saved to an **Archive**. The archive serves as the shopping history and as the learning data that continuously improves the sorting of future Location Lists.

---

## 2. How the Concepts Connect

```
Main List
  └── one item per grocery need (e.g. "Milk", "Bread")
        │
        │  automatically mirrored into
        ▼
Location List  (one per supermarket)
  └── same item, sorted by predicted aisle order for that store
  └── tracks ticked status and user's actual pick-up order
        │
        │  when the session is closed
        ▼
Archive
  └── permanent record of what was bought, where, and in what order
  └── feeds back into the sorting model to improve future predictions
```

The **Main List** drives everything — adding or removing an item there cascades automatically to every Location List. The Location Lists are what the user interacts with during an actual shopping trip. When shopping is done, everything is archived and the lists are cleared, ready for the next trip.

---

## 3. Scenarios

### 3.1 Adding an Item to the List

When a user adds an item (e.g. "Pasta") to the Main List, the following happens:

1. **"Pasta" is added to the Main List.** This is the authoritative record that Pasta needs to be bought.

2. **A Location List entry is created for every supermarket.** For each configured store, the service determines *where* in that store's aisle order "Pasta" should appear. This position is predicted based on past shopping history — if the user has bought Pasta before, the service knows roughly when they tend to pick it up in the store's flow.

3. **The Location List is updated.** All items that come after the predicted position are shifted to make room for "Pasta" at the right spot.

The result: the user adds one item to one list, but it automatically appears in the right position in the shopping view for every supermarket.

### 3.2 Executing a Shopping Session

A shopping session is the act of going to a supermarket and working through the Location List for that store.

**During shopping:**

The user navigates the Location List for their chosen supermarket, which is already sorted in the expected aisle order. As they pick up each item, they **tick it off**. The service records the actual order in which items were picked up — this real-world sequence is the key data that teaches the system how items are actually laid out in the store.

**Closing the session:**

A session can end in two ways:

- **All items ticked (natural completion):** When the user ticks the last remaining item, the session closes automatically. There is nothing left to buy.

- **Early manual close:** The user can also choose to close the session before all items are ticked — for example, if they decide not to buy certain things today. In this case, any items that were *not* ticked are automatically moved back onto the Main List, so they won't be forgotten for the next trip.

**What happens when a session closes:**

1. **Everything is archived.** All items from the Location List, along with the order the user actually picked them up, are saved to the Archive. This data will be used to improve sorting predictions in the future.

2. **All lists are cleared.** The Location Lists and the Main List are wiped clean, resetting the app for the next shopping cycle.

3. **Unticked items are carried over** (only in the early-close case). Any item that wasn't bought is automatically re-added to the Main List and re-inserted into the Location Lists — ready for next time.
