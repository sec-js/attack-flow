<template>
  <div
    class="context-menu-listing-control"
    :style="offset"
    @contextmenu.prevent=""
  >
    <!-- Menu Sections -->
    <div
      class="section"
      v-for="(section, i) of sections"
      :key="section.id"
    >
      <!-- Menu Section -->
      <template
        v-for="item of section.items"
        :key="item.text"
      >
        <!-- Submenu Item -->
        <li
          :class="{ disabled: item.disabled }"
          @mouseenter="submenuEnter(item)"
          @mouseleave="submenuLeave(item)"
          v-if="item.type === MenuType.Submenu"
        >
          <a class="item">
            <span class="text">{{ item.text }}</span>
            <span class="more-arrow" />
          </a>
          <div
            class="submenu"
            v-if="isActive(item)"
          >
            <ContextMenuListing 
              :root="false"
              :sections="item.sections"
              @_select="onChildItemSelect"
            />
          </div>
        </li>
        <!-- Regular Item -->
        <li
          :class="{ disabled: item.disabled }"
          :exit-focus-box="!item.keepMenuOpenOnSelect"
          @click="onItemClick(item)"
          v-else
        >
          <a 
            class="item"
            target="_blank"
          >
            <span
              class="check"
              v-show="'value' in item ? item.value : false"
            >
              ✓
            </span>
            <span class="text">
              {{ item.text }}
            </span>
            <span
              class="shortcut"
              v-if="item.shortcut"
            >
              {{ formatShortcut(item.shortcut) }}
            </span>
          </a>
        </li>
      </template>
      <!-- Section Divider -->
      <a
        class="section-divider"
        v-if="i < sections.length - 1"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import { 
  Device, KeyToTextMacOS, KeyToTextWin,
  MenuType, OperatingSystem
} from '@/assets/scripts/Browser';
import type { CommandEmitter } from '@/assets/scripts/Application';
import type { ContextMenu, ContextMenuItem, ContextMenuSection } from "@/assets/scripts/Browser";

export default defineComponent({
  name: 'ContextMenuListing',
  props: {
    root: {
      type: Boolean,
      default: true,
    },
    sections: {
      type: Array as PropType<ContextMenuSection<CommandEmitter>[]>,
      required: true
    },
    forceInsideWindow: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      xOffset: 0,
      yOffset: 0,
      activeSubMenu: null as string | null,
      leaveTimeout: 500,
      leaveTimeoutId: 0,
      MenuType
    }
  },
  computed: {

    /**
     * Returns the ContextMenuListing's offset styling.
     * @returns
     *  The ContextMenuListing's offset styling.
     */
    offset(): { marginTop: string, marginLeft: string } {
      return {
        marginTop: `${ this.yOffset }px`,
        marginLeft: `${ this.xOffset }px`
      }
    }

  },
  emits: {
    select: (item: CommandEmitter) => item,
    _select: (item: ContextMenuItem<CommandEmitter>) => item,
  },
  methods: {

    /**
     * Tests is a submenu is active.
     * @param menu
     *  The context submenu.
     * @returns
     *  True if the submenu is active, false otherwise.
     */
    isActive(menu: ContextMenu<CommandEmitter>) {
      return menu.text === this.activeSubMenu;
    },

    /**
     * Submenu mouse enter behavior.
     * @param menu
     *  The hovered submenu.
     */
    submenuEnter(menu: ContextMenu<CommandEmitter>) {
      if(!menu.disabled) {
        clearTimeout(this.leaveTimeoutId);
        this.activeSubMenu = menu.text;
      }
    },

    /**
     * Submenu mouse leave behavior.
     * @param menu
     *  The un-hovered submenu.
     */
    submenuLeave(menu: ContextMenu<CommandEmitter>) {
      if(!menu.disabled) {
        this.leaveTimeoutId = window.setTimeout(() => {
          this.activeSubMenu = null;
        }, this.leaveTimeout)
      }
    },

    /**
     * Menu item selection behavior.
     * @param item
     *  The selected menu item.
     */
    onItemClick(item: ContextMenuItem<CommandEmitter>) {
      if(!item.disabled) {
        if(this.root) {
          this.$emit("select", item.data);
        } else {
          this.$emit("_select", item);
        }
      }
    },

    /**
     * Submenu item selection behavior.
     * @param item
     *  The selected menu item.
     */
    onChildItemSelect(item: ContextMenuItem<CommandEmitter>) {
      if(this.root) {
        this.$emit("select", item.data);
      } else {
        this.$emit("_select", item);
      }
      if(!item.keepMenuOpenOnSelect) {
        this.activeSubMenu = null;
      }
    },

    /**
     * Formats a list of keyboard shortcuts for display.
     * @param shortcuts
     *  The array of keyboard shortcuts to concatenate.
     * @returns
     *  The concatenated listing of all shortcuts as a string.
     */
    displayShortcuts(shortcuts?: Array<string>): string | undefined {
      if(!shortcuts) { return shortcuts; }
      else { return shortcuts.map((s: string)=>this.formatShortcut(s)).join(" / "); }
    },

    /**
     * Formats a single keyboard shortcut.
     * @param shortcut
     *  The keyboard shortcut to format.
     * @returns
     *  The formatted keyboard shortcut.
     */
    formatShortcut(shortcut?: string): string | undefined {
      if(!shortcut) {
        return shortcut;
      } else {
        if(Device.getOperatingSystemClass() === OperatingSystem.MacOS) {
          return shortcut
            .split("+")
            .map(c => c in KeyToTextMacOS ? KeyToTextMacOS[c] : c)
            .join("")
        } else {
          return shortcut
            .split("+")
            .map(c => c in KeyToTextWin ? KeyToTextWin[c] : c)
            .join("+");
        }
      }
    }

  },
  mounted() {
    if(!this.forceInsideWindow) return;
    // Offset submenu if outside of viewport
    const viewWidth  = window.innerWidth;
    const viewHeight = window.innerHeight;
    const { top, left, bottom, right } = this.$el.getBoundingClientRect();
    this.xOffset = right > viewWidth ? -Math.min(left, right - viewWidth) : 0;
    this.yOffset = bottom > viewHeight ? -Math.min(top, bottom - viewHeight) : 0;
  }
});
</script>

<style scoped>

/** === Main Control === */

.context-menu-listing-control {
  display: flex;
  flex-direction: column;
  width: max-content;
  min-width: 130px;
  color: #d1d1d1;
  font-size: 10pt;
  padding: 6px 4px;
  border: solid 1px #242424;
  border-radius: 3px;
  box-sizing: border-box;
  background: #383838;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.22);
}

/** === Section Divider === */

.section .section-divider {
  padding: 0px;
  border-bottom: solid 1px #545454;
  margin: 4px 4px;
  cursor: default;
}

/** === Submenu === */

.submenu {
  position: absolute;
  top: -4px;
  left: 100%;
  padding-left: 6px;
  z-index: 1;
}

/** === Menu Item === */

li {
  position: relative;
  list-style: none;
  user-select: none;
}
li:not(.disabled):hover {
  color: #fff;
  background: #726de2;
}

a {
  display: flex;
  padding: 4px 0px;
  cursor: pointer;
}
li.disabled a {
  color: #8f8f8f;
  cursor: unset;
}

.text,
.shortcut,
.more-arrow {
  display: flex;
  align-items: center;
  padding: 0px 23px;
}
.text {
  flex: 1 1 auto;
}
.shortcut {
  flex: 2 1 auto;
  justify-content: right;
}
.check {
  position: absolute;
  left: 5px;
}
.more-arrow::before {
  content: "";
  display: block;
  width: 6px;
  height: 6px;
  border-top: solid 1px;
  border-right: solid 1px;
  transform: rotate(45deg);
}

</style>
