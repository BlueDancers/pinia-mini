import { getCurrentInstance, onUnmounted } from "vue-demi";
import { _Method } from "./types";

export const noop = () => {};

export function addSubscription<T extends _Method>(
  subscriptions: T[],
  callback: T,
  detached?: boolean,
  onCleanup: () => void = noop
) {
  // 使用$Action的时候就会触发本函数
  subscriptions.push(callback);

  const removeSubscription = () => {
    const idx = subscriptions.indexOf(callback);
    if (idx > -1) {
      subscriptions.splice(idx, 1);
      onCleanup();
    }
  };

  if (!detached && getCurrentInstance()) {
    // 如果detached参数不存在，则在当前页面卸载的时候，去除该订阅事件
    onUnmounted(removeSubscription);
  }

  return removeSubscription;
}

export function triggerSubscriptions<T extends _Method>(
  subscriptions: T[],
  ...args: Parameters<T>
) {
  // 将参数传递进入方法
  subscriptions.slice().forEach((callback) => {
    callback(...args);
  });
}
