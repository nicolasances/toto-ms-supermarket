import { DEFAULT_USER_INDEX, LocationListItem } from "../model/LocationListItem";

/**
 * Determines the user index of an item given its "ticked" status
 * 
 * @param items the list of location items
 * @param ticked indicator of whether the item being considered was ticked or unticked
 * @returns the user index of the item
 */
export function determineUserIndex(items: LocationListItem[], ticked: boolean) {

    let assignedUserIndex = DEFAULT_USER_INDEX;

    if (items.length > 0) {

        if (ticked === true) {

            let maxItem = items[0];

            // Find the highest userIndex
            for (const item of items) {
                if (item.id != maxItem.id && item.userIndex > maxItem.userIndex) maxItem = item;
            }

            assignedUserIndex = maxItem.userIndex + 1

        }
        // If the item was unticked, assign it the DEFAULT_USER_INDEX index
        else {
            assignedUserIndex = DEFAULT_USER_INDEX;
        }
    }

    return assignedUserIndex;
}

/**
 * Counts how many items have been ticked in the location list
 * 
 * @param items the list
 * @returns the count
 */
export function countTickedItems(items: LocationListItem[]) {

    let count = 0;

    for (const item of items) {
        if (item.ticked === true) count++
    }

    return count;
}