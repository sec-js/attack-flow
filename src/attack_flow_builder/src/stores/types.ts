import type { Hotkey } from "@/assets/scripts/Browser";
import type { CommandEmitter } from "@/assets/scripts/Application/Commands";
import type { OpenChartFinder } from "@/assets/scripts/OpenChartFinder";
import type { DiagramObjectView } from "@OpenChart/DiagramView";
import type { ObjectRecommender } from "@OpenChart/DiagramEditor";
import type { DiagramViewEditor } from "@OpenChart/DiagramEditor";

/**
 * Vue's reactivity system unwraps Pinia's type definitions. However, it only
 * unwraps publicly exposed members. This prevents a class from being passed
 * around to functions that expect the defined type definition (private members
 * and all). {@link https://github.com/vuejs/core/issues/2981}
 *
 * Until this problem is resolved, vital application types will not be
 * unwrapped.
 */
declare module "@vue/reactivity" {
    export interface RefUnwrapBailTypes {
        classes
        : DiagramViewEditor
            | ObjectRecommender
            | DiagramObjectView
            | Hotkey<CommandEmitter>
            | OpenChartFinder<DiagramViewEditor, DiagramObjectView>;
    }
}
