# Supermarket API

API to manage supermarket lists and their items. <br>
This API also supports Toto Games aimed at gathering information for the training of models. 

## How does it work? 

 * There are a certain number of Supermarket Locations supported. 
 * The user adds items to a Supermarket List.
 * Each time the item is added, **for each Supermarket Location** a sorted list of those items is created. Each new item is compared with the other items in the list (which are already ordered) and placed in the right position. 