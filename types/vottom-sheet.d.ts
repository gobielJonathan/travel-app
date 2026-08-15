declare module "@coderoycc/bottom-sheet-wrappers" {
  import type { DefineComponent } from "vue";

  export const BsSimple: DefineComponent<{
    modelValue?: boolean;
    title?: string;
    height?: string | number;
    showBackdrop?: boolean;
    hideCloseButton?: boolean;
    hideDragHandle?: boolean;
    closeOnBackdrop?: boolean;
    persistent?: boolean;
    zIndex?: number;
  }>;

  export const BsDynamic: DefineComponent;
}
