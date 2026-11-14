# General Idea

The Supermarket API is based on the following core concepts. 

## 1. General Concepts
### 1.1. Supermarket List (SL)
The *Supermarket List (SL)* is the list that is being *edited*. A SL can be used then in a shopping session, when a *Location (L)* has been selected.

### 1.2. Location List (LL)
A *Location List (LL)* is a **sorted list** for a given Location.

### 1.3. Location (L)
A *Location (L)* is a Supermarket in a given place. 

## 2. Specific flows

 1. [Adding an Item](adding-item.md)

## 3. API base path
All the public API paths of the service are prefixed with `/supermarket` (e.g. `/supermarket/list/items`). See [Functional endpoints](functional-endpoints.md).
