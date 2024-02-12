# Executing a Shopping List

Executing a Shopping List (*Location List*) means ticking all items on a Location List when grocery shopping. 

## What happens when I tick an item? 
When an item is ticked, two things happen: 
1. The item is ticked (duh)
2. The item is assigned a `userIndex` which tracks the order in which the user has picked up the items on the list. 

That second step is what actually contributes to create the training data for the model that automatically sorts the items in a list in the "pickup order".

## What happens whne all items are ticked? 
When all items are ticked: 
1. All the items in the Location List are **saved into a separate list** that will be used for training ML models.
2. All the Locations Lists are **closed** (deleted, emptied).
3. The main supermarket list is closed (emptied).

