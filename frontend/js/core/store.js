// frontend/js/core/store.js
// State management for the application

const store = {
  state: {},
  listeners: [],
  setState: (newState) => {
    store.state = { ...store.state, ...newState };
    store.listeners.forEach((listener) => listener(store.state));
  },
  subscribe: (listener) => {
    store.listeners.push(listener);
    return () => {
      store.listeners = store.listeners.filter((l) => l !== listener);
    };
  },
};

window.store = store;