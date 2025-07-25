import { Property } from "..";
import { Crypto, MD5 } from "@OpenChart/Utilities";
import type { Constructor } from "@OpenChart/Utilities";
import type { JsonEntries, JsonValue, PropertyOptions } from "..";

export abstract class CollectionProperty extends Property {

    // TODO: Implement enumerator, get(), size(). Hide value.

    /**
     * The set of properties.
     */
    public value: Map<string, Property>;


    /**
     * Creates a new {@link CollectionProperty}.
     * @param options
     *  The property's options.
     */
    constructor(options: PropertyOptions) {
        super(options);
        this.value = new Map();
    }


    /**
     * Adds a property to the collection.
     * @param property
     *  The property.
     * @param id
     *  The property's id.
     *  (Default: Randomly generated)
     * @param index
     *  The property's location in the collection.
     *  (Default: End of the collection)
     * @param update
     *  Whether to update the parent or not.
     *  (Default: `true`)
     * @returns
     *  The property's id.
     */
    public addProperty(property: Property, id?: string, index?: number, update: boolean = true): string {
        id ??= this.getNextId();
        // Validate
        const current = this.value.get(id)?.id;
        if (current) {
            throw new Error(`${current} already assigned to ${id}.`);
        }
        // Set property's parent
        this.makeChild(property);
        // Add property
        if (index !== undefined) {
            const entries = [...this.value.entries()];
            entries.splice(index, 0, [id, property]);
            this.value = new Map(entries);
        } else {
            this.value.set(id, property);
        }
        // Update property
        if (update) {
            this.updateParentProperty();
        }
        // Return
        return id;
    }

    /**
     * Removes a property from the collection.
     * @param id
     *  The property's id.
     */
    public removeProperty(id: string) {
        const property = this.value.get(id);
        if (property) {
            // Clear property's parent
            this.makeChild(property, null);
            // Remove property
            this.value.delete(id);
        }
        // Update property
        this.updateParentProperty();
    }


    /**
     * Returns a property from the collection.
     * @param id
     *  The property's id.
     * @param type
     *  The property's expected type.
     */
    public get<T extends Property>(id: string, type?: Constructor<T>): T | undefined {
        const property = this.value.get(id);
        if (type && !(property instanceof type)) {
            throw new Error(`Property '${id}' is not a '${type.name}'.`);
        }
        return property as T | undefined;
    }

    /**
     * Returns a property's location in the collection.
     * @param id
     *  The property's id.
     * @returns
     *  The property's location in the collection.
     */
    public indexOf(id: string): number {
        return [...this.value.keys()].indexOf(id);
    }

    /**
     * Returns a randomly generated id not in use by the list.
     * @returns
     *  A randomly generated id.
     */
    public getNextId() {
        let id = MD5(Crypto.randomUUID());
        while (this.value.has(id)) {
            id = MD5(Crypto.randomUUID());
        }
        return id;
    }

    /**
     * Returns the property's JSON value.
     * @returns
     *  The property's JSON value.
     */
    public toJson(): { [x: string]: JsonValue } {
        return Object.fromEntries(
            [...this.value].map(([k, v]) => [k, v.toJson()])
        );
    }

    /**
     * Returns the property's ordered JSON value.
     * @returns
     *  The property's ordered JSON value.
     */
    public toOrderedJson(): JsonEntries {
        const entries: JsonEntries = [];
        for (const [id, value] of this.value) {
            if (value instanceof CollectionProperty) {
                entries.push([id, value.toOrderedJson()]);
            } else {
                entries.push([id, value.toJson()]);
            }
        }
        return entries;
    }

    /**
     * Returns the property's hashed value.
     * @returns
     *  The property's hashed value.
     */
    public toHashValue(): number {
        const text = [...this.value.values()].map(v => v.toHashValue()).join(".");
        return this.computeHash(text);
    }

}
