let locks = 0;
let overflow = "";
let paddingRight = "";

export function useBodyScrollLock(isLocked: () => boolean) {
  let active = false;
  function lock() {
    if (active) return;
    if (locks === 0) {
      overflow = document.body.style.overflow;
      paddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth) document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    locks += 1;
    active = true;
  }
  function unlock() {
    if (!active) return;
    locks -= 1;
    active = false;
    if (locks === 0) {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    }
  }
  watch(isLocked, (value) => (value ? lock() : unlock()), { immediate: true });
  onUnmounted(unlock);
}
