# Suppie Games

## 1. Sort the items
This game asks the user to choose, for a given supermarket, which of two items comes first in the shopping order. <br>
The goal of the game is to save data to be able to **train** a model to automatically define the shopping order of items in a supermarket list. 

### 1.1. Service
`toto-ms-supermarket` provides an endpoint to save the user choice. <br>
Some important aspects: 

 * Choices are **not user-based**. I assume the sorting to be universal, not bound to a single person's favorite shopping route. 

The data that is saved is always: 
 * `supermarketId` - Id of the supermarket
 * `item1` - the first item (the text)
 * `item2` - the second item (the text)
 * `label` - a value 'before' or 'after' that states the position of `item1` compared to `item2` in the supermarket
 * `date` - stores the date of the training example so that we can later decide if we only want to train on "recent" data
